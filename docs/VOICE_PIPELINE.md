# Voice Pipeline & Barge-In DSP

Natural voice tutoring requires interrupting AI audio cleanly without cutting off the user's opening syllables or misfiring on speaker echo.

## 1. Circular PCM Pre-Roll (`src/lib/pcm-audio.ts`)

- `PcmRingBuffer(sampleRate, maxDurationMs)` stores the trailing 1.5 seconds of microphone Float32 frames in a constant-memory circular buffer.
- When `VoiceBargeInDetector` fires after the `180ms` speech sustain window, calling `ringBuffer.readLastMs(...)` recovers the words spoken *before* the threshold crossed.
- `encodeWav16kMono(samples, sourceSampleRate)` downsamples arbitrary browser hardware rates (44.1kHz / 48kHz) into a standard 16 kHz, 16-bit signed mono WAV buffer ready for Whisper STT.

## 2. Adaptive Barge-In State Machine (`src/lib/voice-barge-in.ts`)

- **Post-Start Grace Window (`260ms`)**: Ignores initial mic click or AGC spikes when tutor playback starts.
- **Dynamic Noise Floor**: Tracks ambient quiet-room RMS (`noiseFloor`) so whispers in quiet rooms work without false triggers in noisier rooms.
- **Vocal Formant Gating (`250Hz–3200Hz`)**: `computeSpeechBandAverage` checks FFT bin energy inside the human vocal band to reject low-frequency desk thumps or mouse clicks.
- **Playback-Aware Echo Guard**: Raises threshold during `"synthesis"` playback (`0.11` vs `0.055` for `"audio"`) while resetting `speechOnsetMs` cleanly when speech stops.

## 3. Natural Speech Punctuation (`src/lib/transcript-punctuation.ts`)

Browser Web Speech transcripts arrive lowercase and unpunctuated. `punctuateBrowserTranscript` preserves already-punctuated text, inserts commas after discourse markers (`tunggu`, `wait`, `excuse me`, `halo`, `well`, etc.) and trailing question tags, capitalizes initial letters, and appends `?` / `.` (or CJK `？` / `。`).
