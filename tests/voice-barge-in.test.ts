import assert from "node:assert/strict";
import test from "node:test";
import { concatFloat32, downsamplePcm, encodeWav16kMono, PcmRingBuffer } from "../src/lib/pcm-audio";
import { computeRms, computeSpeechBandAverage, VoiceBargeInDetector } from "../src/lib/voice-barge-in";

test("computeRms and computeSpeechBandAverage measure signal amplitude and vocal formants", () => {
  const silent = new Uint8Array(128).fill(128);
  assert.equal(computeRms(silent), 0);

  const loud = new Uint8Array(128).fill(160);
  assert.ok(Math.abs(computeRms(loud) - 0.25) < 0.01);

  const bins = new Uint8Array(256).fill(0);
  // Sample rate 48000 Hz, fftSize 512 => ~93.75 Hz/bin. 250-3200Hz spans bins 2..35.
  for (let i = 3; i <= 34; i += 1) {
    bins[i] = 40;
  }
  const avg = computeSpeechBandAverage(bins, 48000, 512);
  assert.ok(avg > 35 && avg <= 40);

  // Bins exclusively below 200 Hz should yield near-zero vocal band average.
  const subBass = new Uint8Array(256).fill(0);
  subBass[0] = 200;
  subBass[1] = 200;
  assert.equal(computeSpeechBandAverage(subBass, 48000, 512), 0);
});

test("VoiceBargeInDetector ignores speech during 260ms grace period, tracks onsetMs, and triggers after 180ms sustain", () => {
  const detector = new VoiceBargeInDetector(1000);

  // During 260ms post-start grace period: never triggers even with speech-level audio.
  for (let t = 1040; t <= 1240; t += 40) {
    const res = detector.step({
      nowMs: t,
      dtMs: 40,
      rms: 0.09,
      voiceBandAvg: 34,
      playbackMode: "audio",
    });
    assert.equal(res.triggered, false);
    assert.equal(res.onsetMs, null);
  }

  // After grace period: accumulate across 40ms frames; 5th frame (200ms >= 180ms) triggers and preserves first onsetMs.
  let triggeredAt: number | null = null;
  let capturedOnset: number | null = null;
  for (let t = 1280; t <= 1600; t += 40) {
    const res = detector.step({
      nowMs: t,
      dtMs: 40,
      rms: 0.08,
      voiceBandAvg: 32,
      playbackMode: "audio",
    });
    if (res.triggered && triggeredAt === null) {
      triggeredAt = t;
      capturedOnset = res.onsetMs;
      break;
    }
  }

  assert.equal(triggeredAt, 1440);
  assert.equal(capturedOnset, 1240);
});

test("VoiceBargeInDetector rejects brief clicks, clears onsetMs on decay, and blocks low-frequency thumps", () => {
  const detector = new VoiceBargeInDetector(0);

  // Brief click (3 frames = 120ms < 180ms), followed by silence.
  for (let t = 400; t <= 480; t += 40) {
    const res = detector.step({
      nowMs: t,
      dtMs: 40,
      rms: 0.14,
      voiceBandAvg: 40,
      playbackMode: "audio",
    });
    assert.equal(res.triggered, false);
    assert.equal(res.onsetMs, 360);
  }

  let decayedOnset: number | null = 360;
  for (let t = 520; t <= 720; t += 40) {
    const res = detector.step({
      nowMs: t,
      dtMs: 40,
      rms: 0.01,
      voiceBandAvg: 5,
      playbackMode: "audio",
    });
    assert.equal(res.triggered, false);
    decayedOnset = res.onsetMs;
  }
  assert.equal(decayedOnset, null);

  // Sustained low-frequency desk bump (voiceBandAvg < 16).
  for (let t = 760; t <= 1200; t += 40) {
    const res = detector.step({
      nowMs: t,
      dtMs: 40,
      rms: 0.15,
      voiceBandAvg: 10,
      playbackMode: "audio",
    });
    assert.equal(res.triggered, false);
  }
});

test("VoiceBargeInDetector raises echo guard during synthesis playback while allowing clear user speech", () => {
  const detector = new VoiceBargeInDetector(0);

  // Mild 0.08 RMS speaker bleed during browser SpeechSynthesis stays below 0.11 threshold.
  for (let t = 400; t <= 840; t += 40) {
    const res = detector.step({
      nowMs: t,
      dtMs: 40,
      rms: 0.08,
      voiceBandAvg: 32,
      playbackMode: "synthesis",
    });
    assert.equal(res.triggered, false);
  }

  // Genuine user voice (0.15 RMS, 32 voiceBandAvg) interrupts cleanly after sustain.
  let interrupted = false;
  for (let t = 880; t <= 1240; t += 40) {
    const res = detector.step({
      nowMs: t,
      dtMs: 40,
      rms: 0.15,
      voiceBandAvg: 32,
      playbackMode: "synthesis",
    });
    if (res.triggered) {
      interrupted = true;
      break;
    }
  }

  assert.equal(interrupted, true);
});

test("PcmRingBuffer preserves chronological wrap-around frames and readLastMs slice", () => {
  const ring = new PcmRingBuffer(1000, 10); // 10 samples capacity (10ms at 1kHz)
  ring.push(new Float32Array([1, 2, 3, 4]));
  ring.push(new Float32Array([5, 6, 7, 8]));
  ring.push(new Float32Array([9, 10, 11, 12]));

  assert.equal(ring.length, 10);
  assert.deepEqual(Array.from(ring.readLastMs(10)), [3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  assert.deepEqual(Array.from(ring.readLastMs(4)), [9, 10, 11, 12]);

  ring.clear();
  assert.equal(ring.length, 0);
  assert.equal(ring.readLastMs(5).length, 0);
});

test("downsamplePcm and encodeWav16kMono output valid 16kHz 16-bit mono WAV", () => {
  const chunkA = new Float32Array(2400).fill(0.25);
  const chunkB = new Float32Array(2400).fill(-0.25);
  const joined = concatFloat32([chunkA, chunkB]); // 100ms at 48kHz
  assert.equal(joined.length, 4800);

  const down = downsamplePcm(joined, 48000, 16000);
  assert.equal(down.length, 1600);
  assert.ok(Math.abs(down[0] - 0.25) < 0.001);
  assert.ok(Math.abs(down[1599] + 0.25) < 0.001);

  const wav = encodeWav16kMono(joined, 48000);
  assert.equal(wav.byteLength, 44 + 1600 * 2);
  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  assert.equal(String.fromCharCode(wav[0], wav[1], wav[2], wav[3]), "RIFF");
  assert.equal(String.fromCharCode(wav[8], wav[9], wav[10], wav[11]), "WAVE");
  assert.equal(view.getUint16(20, true), 1); // PCM format
  assert.equal(view.getUint16(22, true), 1); // Mono
  assert.equal(view.getUint32(24, true), 16000); // Sample rate
  assert.equal(view.getUint16(34, true), 16); // Bits per sample
});
