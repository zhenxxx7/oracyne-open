# Self-Hosting & Extending Guide

## Running Locally

```bash
git clone https://github.com/zhenxxx7/oracyne-open.git
cd oracyne-open
npm install
npm start
```

Set `PORT` in `.env` if you want to run on a port other than `3100`. Note that `npm start` and `npm run dev` bind `127.0.0.1` by default for local safety.

## Importing the Open-Source Modules in Your Own App

Each file under `src/lib/` compiles cleanly in Node.js (v20+) and browser bundlers (`esbuild`, Vite, Next.js) with zero external runtime dependencies:

- `VoiceBargeInDetector`, `computeRms`, `computeSpeechBandAverage`
- `PcmRingBuffer`, `concatFloat32`, `downsamplePcm`, `encodeWav16kMono`
- `punctuateBrowserTranscript`
- `SUPPORTED_LANGUAGES`, `TUTOR_VOICE_PRESETS`, `findSupportedLanguage`, `getSpeechLanguageCode`, `getNeuralVoiceForLanguage`
- `detectTtsLanguage`, `splitTtsSegments`
