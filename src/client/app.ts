import { SUPPORTED_LANGUAGES, TUTOR_VOICE_PRESETS, type SupportedLanguage } from "../lib/languages";
import { PcmRingBuffer, encodeWav16kMono } from "../lib/pcm-audio";
import { punctuateBrowserTranscript } from "../lib/transcript-punctuation";
import { detectTtsLanguage, splitTtsSegments } from "../lib/tts-language";
import { VoiceBargeInDetector, computeRms, computeSpeechBandAverage } from "../lib/voice-barge-in";

type HealthResponse = {
  ok: boolean;
  edition: string;
  mode: "colab" | "local-demo";
  languages: number;
};

type ChatResponse = {
  mode: string;
  warning?: string;
  input: string;
  reply: string;
  tip: string;
  speechCode: string;
};

const detector = new VoiceBargeInDetector(performance.now());
const ringBuffer = new PcmRingBuffer(16000, 1500);

let tutorSpeaking = false;
let micActive = false;
let micStream: MediaStream | null = null;
let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let rafId: number | null = null;
let lastFrameMs = performance.now();

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) {
    throw new Error(`Missing DOM element #${id}`);
  }
  return node as T;
}

function setStatusBadge(modeText: string, isColab: boolean) {
  const badge = el<HTMLSpanElement>("runtime-badge");
  badge.textContent = modeText;
  badge.className = isColab ? "pill pill-colab" : "pill pill-demo";
}

function speakText(text: string, speechCode: string) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = speechCode;
  utterance.onend = () => {
    if (!tutorSpeaking) return;
    tutorSpeaking = false;
    el<HTMLSpanElement>("barge-state").textContent = "Idle";
  };
  window.speechSynthesis.speak(utterance);
}

function updateMeterUi(rms: number, voiceBand: number, speechRatio: number, label: string) {
  el<HTMLDivElement>("rms-fill").style.width = `${Math.min(100, Math.round(rms * 400))}%`;
  el<HTMLDivElement>("barge-fill").style.width = `${Math.min(100, Math.round(speechRatio * 100))}%`;
  el<HTMLSpanElement>("dsp-metrics").textContent = `RMS ${rms.toFixed(3)} · Formant ${voiceBand.toFixed(1)}`;
  el<HTMLSpanElement>("barge-state").textContent = label;
}

function triggerBargeIn(onsetMs: number | null) {
  tutorSpeaking = false;
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  const preRollSamples = ringBuffer.readLastMs(400);
  const wavBytes = encodeWav16kMono(preRollSamples, 16000).byteLength;
  const elapsed = onsetMs !== null ? Math.max(0, Math.round(performance.now() - onsetMs)) : 0;
  el<HTMLParagraphElement>("barge-log").textContent =
    `Barge-in triggered! Stopped tutor playback, preserved ${wavBytes} WAV pre-roll bytes (speech onset ${elapsed}ms ago).`;
  updateMeterUi(0.16, 48, 1, "Interrupted -> User Speaking");
}

function startTutorTurn() {
  const sampleLine = "Hey! Speak naturally anytime — try interrupting mid-sentence to test the adaptive voice detector.";
  tutorSpeaking = true;
  detector.reset(performance.now());
  el<HTMLSpanElement>("barge-state").textContent = "Tutor Speaking (260ms grace -> listening for barge-in)";
  el<HTMLParagraphElement>("barge-log").textContent =
    "Tutor speaking… Start talking or press 'Simulate User Interrupt' to verify barge-in detection.";
  speakText(sampleLine, "en-US");
}

function simulateUserInterrupt() {
  if (!tutorSpeaking) {
    startTutorTurn();
  }
  const base = performance.now() + 280; // step past 260ms initial grace period cleanly
  let triggered = false;

  for (let offset = 0; offset <= 240; offset += 40) {
    const res = detector.step({
      nowMs: base + offset,
      dtMs: 40,
      rms: 0.16,
      voiceBandAvg: 52,
      playbackMode: "synthesis",
    });
    updateMeterUi(0.16, 52, res.speechRatio, "Detecting User Speech…");
    if (res.triggered && !triggered) {
      triggered = true;
      ringBuffer.push(new Float32Array(3200).fill(0.08));
      triggerBargeIn(res.onsetMs);
      break;
    }
  }
}

async function toggleMicrophone() {
  const btn = el<HTMLButtonElement>("mic-btn");
  if (micActive) {
    micActive = false;
    if (rafId !== null) cancelAnimationFrame(rafId);
    micStream?.getTracks().forEach((t) => t.stop());
    await audioCtx?.close();
    micStream = null;
    audioCtx = null;
    analyser = null;
    btn.textContent = "Start Live Mic";
    updateMeterUi(0, 0, 0, tutorSpeaking ? "Tutor Speaking" : "Idle");
    return;
  }

  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(micStream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);

    micActive = true;
    btn.textContent = "Stop Live Mic";
    const timeDomain = new Uint8Array(analyser.fftSize);
    const freqBins = new Uint8Array(analyser.frequencyBinCount);
    const floatFrame = new Float32Array(analyser.fftSize);
    lastFrameMs = performance.now();

    const loop = () => {
      if (!micActive || !analyser || !audioCtx) return;
      const nowMs = performance.now();
      const dtMs = Math.max(1, nowMs - lastFrameMs);
      lastFrameMs = nowMs;

      analyser.getByteTimeDomainData(timeDomain);
      analyser.getByteFrequencyData(freqBins);
      for (let i = 0; i < timeDomain.length; i += 1) {
        floatFrame[i] = (timeDomain[i] - 128) / 128;
      }
      ringBuffer.push(floatFrame);

      const rms = computeRms(timeDomain);
      const voiceBand = computeSpeechBandAverage(freqBins, audioCtx.sampleRate, analyser.fftSize);
      const res = detector.step({
        nowMs,
        dtMs,
        rms,
        voiceBandAvg: voiceBand,
        playbackMode: tutorSpeaking ? "synthesis" : null,
      });

      if (res.triggered && tutorSpeaking) {
        triggerBargeIn(res.onsetMs);
      } else {
        updateMeterUi(rms, voiceBand, res.speechRatio, tutorSpeaking ? "Listening during Playback" : "Mic Ready");
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  } catch (err) {
    el<HTMLParagraphElement>("barge-log").textContent =
      err instanceof Error ? `Mic unavailable (${err.message}). Use 'Simulate User Interrupt' instead.` : "Mic unavailable.";
  }
}

async function runPunctuationTest() {
  const text = el<HTMLTextAreaElement>("punctuate-input").value.trim();
  const language = el<HTMLSelectElement>("punctuate-lang").value;
  if (!text) return;

  const clientPreview = punctuateBrowserTranscript(text, language);
  const clientLang = detectTtsLanguage(clientPreview, language);
  const res = await fetch("/api/punctuate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });
  const data = (await res.json()) as {
    punctuated?: string;
    detectedSpeechCode?: string;
    segments?: Array<{ text: string; language: string }>;
    error?: string;
  };

  if (!res.ok) {
    el<HTMLPreElement>("punctuate-output").textContent = data.error ?? "Failed to punctuate.";
    return;
  }

  el<HTMLPreElement>("punctuate-output").textContent = JSON.stringify(
    {
      clientPreview,
      clientLang,
      serverPunctuated: data.punctuated,
      detectedSpeechCode: data.detectedSpeechCode,
      ttsSegments: data.segments,
    },
    null,
    2,
  );
}

async function sendChatMessage(e?: Event) {
  e?.preventDefault();
  const input = el<HTMLInputElement>("chat-input");
  const message = input.value.trim();
  if (!message) return;
  const language = el<HTMLSelectElement>("chat-lang").value;

  const log = el<HTMLDivElement>("chat-log");
  const userRow = document.createElement("div");
  userRow.className = "chat-bubble chat-user";
  userRow.textContent = message;
  log.appendChild(userRow);
  input.value = "";

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, language }),
  });
  const data = (await res.json()) as ChatResponse;

  const botRow = document.createElement("div");
  botRow.className = "chat-bubble chat-bot";
  const replyText = document.createElement("p");
  replyText.textContent = data.reply;
  const meta = document.createElement("div");
  meta.className = "chat-meta";
  meta.textContent = `[${data.mode}] Tip: ${data.tip}`;
  const speakBtn = document.createElement("button");
  speakBtn.type = "button";
  speakBtn.className = "btn btn-ghost";
  speakBtn.textContent = `Speak (${data.speechCode})`;
  speakBtn.addEventListener("click", () => speakText(data.reply, data.speechCode));

  botRow.append(replyText, meta, speakBtn);
  log.appendChild(botRow);
  log.scrollTop = log.scrollHeight;
}

function renderLanguageCatalog(filter = "") {
  const grid = el<HTMLDivElement>("lang-grid");
  const q = filter.trim().toLowerCase();
  const filtered = SUPPORTED_LANGUAGES.filter(
    (item: SupportedLanguage) =>
      !q ||
      item.label.toLowerCase().includes(q) ||
      item.nativeName.toLowerCase().includes(q) ||
      item.speechCode.toLowerCase().includes(q),
  );

  grid.innerHTML = "";
  for (const lang of filtered) {
    const card = document.createElement("div");
    card.className = "lang-card";
    card.innerHTML = `<strong>${lang.label}</strong><span>${lang.nativeName}</span><code>${lang.speechCode} · ${lang.neuralVoice}</code>`;
    grid.appendChild(card);
  }
}

function wireTabs() {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>("[data-tab]"));
  const panels = Array.from(document.querySelectorAll<HTMLElement>("[data-panel]"));

  for (const btn of buttons) {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      buttons.forEach((b) => b.classList.toggle("active", b.dataset.tab === target));
      panels.forEach((p) => p.classList.toggle("hidden", p.dataset.panel !== target));
    });
  }
}

async function init() {
  wireTabs();

  // Populate language dropdowns and preset list
  const langSelects = [el<HTMLSelectElement>("punctuate-lang"), el<HTMLSelectElement>("chat-lang")];
  for (const select of langSelects) {
    for (const lang of SUPPORTED_LANGUAGES) {
      const opt = document.createElement("option");
      opt.value = lang.value;
      opt.textContent = `${lang.label} (${lang.nativeName})`;
      select.appendChild(opt);
    }
  }

  const presetList = el<HTMLDivElement>("preset-list");
  presetList.innerHTML = "";
  for (const preset of TUTOR_VOICE_PRESETS) {
    const chip = document.createElement("div");
    chip.className = "preset-chip";
    chip.innerHTML = `<strong>${preset.label}</strong><span>${preset.hint}</span>`;
    presetList.appendChild(chip);
  }

  renderLanguageCatalog();

  el<HTMLButtonElement>("tutor-play-btn").addEventListener("click", startTutorTurn);
  el<HTMLButtonElement>("simulate-barge-btn").addEventListener("click", simulateUserInterrupt);
  el<HTMLButtonElement>("mic-btn").addEventListener("click", () => void toggleMicrophone());
  el<HTMLButtonElement>("punctuate-btn").addEventListener("click", () => void runPunctuationTest());
  el<HTMLFormElement>("chat-form").addEventListener("submit", (e) => void sendChatMessage(e));
  el<HTMLInputElement>("lang-search").addEventListener("input", (e) => {
    renderLanguageCatalog((e.target as HTMLInputElement).value);
  });

  document.querySelectorAll<HTMLButtonElement>("[data-sample]").forEach((btn) => {
    btn.addEventListener("click", () => {
      el<HTMLInputElement>("chat-input").value = btn.dataset.sample ?? "";
    });
  });

  try {
    const res = await fetch("/api/health");
    const health = (await res.json()) as HealthResponse;
    setStatusBadge(
      health.mode === "colab"
        ? `Colab GPU Connected · ${health.languages} Languages`
        : `Local Demo Mode · ${health.languages} Languages`,
      health.mode === "colab",
    );
  } catch {
    setStatusBadge("Offline Check Failed", false);
  }
}

document.addEventListener("DOMContentLoaded", () => void init());
