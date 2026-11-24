# Oracyne Open Architecture

Oracyne Open is intentionally minimal and modular so developers can study, test, and embed the core conversational voice primitives without database migrations or external auth infrastructure.

## Project Layout

```text
oracyne-open/
├── colab/
│   └── oracyne_colab_llm.ipynb      # GPU gateway notebook (Qwen + Whisper + Kokoro)
├── docs/                            # Public architecture and DSP documentation
├── public/
│   ├── index.html                   # 3-tab sandbox UI
│   └── styles.css                   # Responsive dark-editorial UI theme
├── src/
│   ├── client/
│   │   └── app.ts                   # Browser sandbox bundled to dist/client/app.js
│   ├── lib/
│   │   ├── pcm-audio.ts             # PcmRingBuffer + 16kHz WAV encoder
│   │   ├── voice-barge-in.ts        # VoiceBargeInDetector + formant band DSP
│   │   ├── transcript-punctuation.ts# Natural punctuation + question detection
│   │   ├── languages.ts             # 28 languages & voice presets
│   │   └── tts-language.ts          # Script/lexicon detection & TTS splitting
│   └── server.ts                    # Stateless Node HTTP server & API endpoints
└── tests/
    ├── open-server.test.ts          # Live HTTP integration test
    ├── transcript-punctuation.test.ts
    └── voice-barge-in.test.ts
```

## HTTP Endpoints (`src/server.ts`)

| Route | Method | Behavior |
| --- | --- | --- |
| `/` | `GET` | Serves `public/index.html` |
| `/app.js` | `GET` | Serves the `esbuild`-compiled browser bundle (`dist/client/app.js`) |
| `/api/health` | `GET` | Reports edition (`community-limited`), active mode (`colab` or `local-demo`), and language count |
| `/api/languages` | `GET` | Returns `SUPPORTED_LANGUAGES` and `TUTOR_VOICE_PRESETS` |
| `/api/punctuate` | `POST` | Applies `punctuateBrowserTranscript`, `detectTtsLanguage`, and `splitTtsSegments` |
| `/api/chat` | `POST` | Stateless single-turn demo tutor using Colab `/v1/chat/completions` when configured, or built-in Local Demo Coach |
