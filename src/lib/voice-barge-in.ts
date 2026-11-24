export type BargeInPlaybackMode = "audio" | "synthesis" | null;

export type VoiceBargeInDetectorOptions = {
  graceMs?: number;
  sustainMs?: number;
  minVoiceBand?: number;
  initialNoiseFloor?: number;
  maxNoiseFloor?: number;
};

/** Compute normalized RMS amplitude [0..1] from byte time-domain PCM samples centered at 128. */
export function computeRms(timeDomain: Uint8Array): number {
  if (!timeDomain.length) {
    return 0;
  }

  let sum = 0;
  for (let i = 0; i < timeDomain.length; i += 1) {
    const centered = (timeDomain[i] - 128) / 128;
    sum += centered * centered;
  }

  return Math.min(1, Math.sqrt(sum / timeDomain.length));
}

/** Average FFT bin energy within the human vocal formant band (250Hz-3200Hz) to reject low thumps. */
export function computeSpeechBandAverage(freqBins: Uint8Array, sampleRate: number, fftSize: number): number {
  if (!freqBins.length || sampleRate <= 0 || fftSize <= 0) {
    return 0;
  }

  const hzPerBin = sampleRate / fftSize;
  const startBin = Math.max(0, Math.floor(250 / hzPerBin));
  const endBin = Math.min(freqBins.length - 1, Math.ceil(3200 / hzPerBin));
  if (endBin < startBin) {
    return 0;
  }

  let total = 0;
  for (let i = startBin; i <= endBin; i += 1) {
    total += freqBins[i];
  }

  return total / (endBin - startBin + 1);
}

/**
 * Adaptive state machine that detects intentional human speech barge-in while
 * rejecting brief mic clicks, low-frequency bumps, and speaker echo during playback.
 */
export class VoiceBargeInDetector {
  private readonly graceMs: number;
  private readonly sustainMs: number;
  private readonly minVoiceBand: number;
  private readonly maxNoiseFloor: number;

  private startedAtMs: number;
  private noiseFloor: number;
  private speechAccumMs = 0;
  private speechOnsetMs: number | null = null;

  constructor(startedAtMs = 0, options?: VoiceBargeInDetectorOptions) {
    this.startedAtMs = startedAtMs;
    this.graceMs = options?.graceMs ?? 260;
    this.sustainMs = options?.sustainMs ?? 180;
    this.minVoiceBand = options?.minVoiceBand ?? 16;
    this.noiseFloor = options?.initialNoiseFloor ?? 0.02;
    this.maxNoiseFloor = options?.maxNoiseFloor ?? 0.06;
  }

  /** Reset accumulation state at the start of a new tutor speaking turn. */
  reset(nowMs = 0) {
    this.startedAtMs = nowMs;
    this.speechAccumMs = 0;
    this.speechOnsetMs = null;
  }

  /** Advance detector state by one audio analysis frame. */
  step(input: {
    nowMs: number;
    dtMs: number;
    rms: number;
    voiceBandAvg: number;
    playbackMode: BargeInPlaybackMode;
  }): { triggered: boolean; speechRatio: number; onsetMs: number | null } {
    const safeDt = Math.max(0, Math.min(100, input.dtMs));

    if (input.nowMs - this.startedAtMs < this.graceMs) {
      if (input.rms < 0.06) {
        this.noiseFloor = Math.min(this.maxNoiseFloor, this.noiseFloor * 0.94 + input.rms * 0.06);
      }
      return { triggered: false, speechRatio: 0, onsetMs: null };
    }

    const baseThreshold =
      input.playbackMode === "synthesis" ? 0.11 : input.playbackMode === "audio" ? 0.055 : 0.045;
    const threshold = Math.max(baseThreshold, this.noiseFloor * 2.4);

    if (input.rms >= threshold && input.voiceBandAvg >= this.minVoiceBand) {
      if (this.speechOnsetMs === null) {
        this.speechOnsetMs = Math.max(this.startedAtMs, input.nowMs - safeDt);
      }
      this.speechAccumMs += safeDt;
      const speechRatio = Math.min(1, this.speechAccumMs / this.sustainMs);
      return {
        triggered: this.speechAccumMs >= this.sustainMs,
        speechRatio,
        onsetMs: this.speechOnsetMs,
      };
    }

    this.noiseFloor = Math.min(this.maxNoiseFloor, this.noiseFloor * 0.94 + input.rms * 0.06);
    this.speechAccumMs = Math.max(0, this.speechAccumMs - safeDt * 1.6);
    if (this.speechAccumMs === 0) {
      this.speechOnsetMs = null;
    }
    return {
      triggered: false,
      speechRatio: Math.min(1, this.speechAccumMs / this.sustainMs),
      onsetMs: this.speechOnsetMs,
    };
  }
}
