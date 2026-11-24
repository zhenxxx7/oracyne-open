const TARGET_WAV_SAMPLE_RATE = 16000;

/**
 * Circular PCM buffer keeping recent microphone frames so voice barge-in and
 * hands-free VAD captures never clip the user's opening syllables.
 */
export class PcmRingBuffer {
  private readonly buffer: Float32Array;
  private readonly _sampleRate: number;
  private writeIndex = 0;
  private filled = 0;

  constructor(sampleRate: number, maxDurationMs = 1500) {
    this._sampleRate = Math.max(1, Math.round(sampleRate));
    const capacity = Math.max(1, Math.round((this._sampleRate * maxDurationMs) / 1000));
    this.buffer = new Float32Array(capacity);
  }

  get sampleRate(): number {
    return this._sampleRate;
  }

  get length(): number {
    return this.filled;
  }

  push(samples: Float32Array) {
    if (!samples.length) return;
    const capacity = this.buffer.length;

    if (samples.length >= capacity) {
      const tail = samples.subarray(samples.length - capacity);
      this.buffer.set(tail, 0);
      this.writeIndex = 0;
      this.filled = capacity;
      return;
    }

    const firstPart = Math.min(samples.length, capacity - this.writeIndex);
    this.buffer.set(samples.subarray(0, firstPart), this.writeIndex);
    const remaining = samples.length - firstPart;
    if (remaining > 0) {
      this.buffer.set(samples.subarray(firstPart), 0);
    }

    this.writeIndex = (this.writeIndex + samples.length) % capacity;
    this.filled = Math.min(capacity, this.filled + samples.length);
  }

  readLastMs(durationMs: number): Float32Array {
    if (!this.filled || durationMs <= 0) {
      return new Float32Array(0);
    }
    const requested = Math.round((this._sampleRate * durationMs) / 1000);
    const count = Math.max(0, Math.min(this.filled, requested));
    if (!count) {
      return new Float32Array(0);
    }

    const capacity = this.buffer.length;
    const start = (this.writeIndex - count + capacity) % capacity;
    const out = new Float32Array(count);
    const firstPart = Math.min(count, capacity - start);
    out.set(this.buffer.subarray(start, start + firstPart), 0);
    const remaining = count - firstPart;
    if (remaining > 0) {
      out.set(this.buffer.subarray(0, remaining), firstPart);
    }
    return out;
  }

  clear() {
    this.writeIndex = 0;
    this.filled = 0;
  }
}

/** Concatenate ordered Float32 PCM frames into a single contiguous array. */
export function concatFloat32(chunks: Float32Array[]): Float32Array {
  let total = 0;
  for (const chunk of chunks) {
    total += chunk.length;
  }
  const out = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    if (chunk.length > 0) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
  }
  return out;
}

/** Downsample mono Float32 PCM audio cleanly using box-averaging. */
export function downsamplePcm(
  samples: Float32Array,
  fromRate: number,
  toRate = TARGET_WAV_SAMPLE_RATE,
): Float32Array {
  if (!samples.length || fromRate <= 0 || toRate <= 0) {
    return new Float32Array(0);
  }
  if (fromRate === toRate) {
    return new Float32Array(samples);
  }
  if (fromRate < toRate) {
    const outLength = Math.max(1, Math.round((samples.length * toRate) / fromRate));
    const out = new Float32Array(outLength);
    const ratio = fromRate / toRate;
    for (let i = 0; i < outLength; i += 1) {
      const idx = i * ratio;
      const lo = Math.floor(idx);
      const hi = Math.min(samples.length - 1, lo + 1);
      const frac = idx - lo;
      out[i] = samples[lo] * (1 - frac) + samples[hi] * frac;
    }
    return out;
  }

  const ratio = fromRate / toRate;
  const outLength = Math.max(1, Math.floor(samples.length / ratio));
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(samples.length, Math.floor((i + 1) * ratio));
    if (end <= start) {
      out[i] = samples[Math.min(samples.length - 1, start)];
      continue;
    }
    let acc = 0;
    for (let j = start; j < end; j += 1) {
      acc += samples[j];
    }
    out[i] = acc / (end - start);
  }
  return out;
}

/** Encode mono Float32 PCM samples into a 16 kHz, 16-bit signed PCM RIFF/WAVE payload. */
export function encodeWav16kMono(samples: Float32Array, sourceSampleRate: number): Uint8Array {
  const pcm = downsamplePcm(samples, sourceSampleRate, TARGET_WAV_SAMPLE_RATE);
  const dataLength = pcm.length * 2;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  const writeAscii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(8, "WAVE");
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // Linear PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, TARGET_WAV_SAMPLE_RATE, true);
  view.setUint32(28, TARGET_WAV_SAMPLE_RATE * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeAscii(36, "data");
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < pcm.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, pcm[i]));
    view.setInt16(offset, clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff), true);
    offset += 2;
  }

  return new Uint8Array(buffer);
}
