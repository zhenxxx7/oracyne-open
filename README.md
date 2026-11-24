# Oracyne AI — Open-Source Community Edition

**Oracyne Open** is the **limited, standalone MIT-licensed open-source edition** of Oracyne AI. It packages the real-time voice barge-in detector, circular PCM pre-roll ring buffer, natural speech punctuation engine, 28-language neural voice catalog, Google Colab GPU notebook, and a zero-dependency runnable Voice Sandbox (`PORT=3100`).

> **Scope Note:** This public repository intentionally provides the **limited open-source voice core, Colab gateway template, and standalone sandbox**. Full SaaS platform components (multi-user Google OAuth + verified email authentication, Cloudflare Turnstile protection, admin role management, PostgreSQL curriculum/XP persistence, and automated Colab quota orchestration) live in the private main repository (`zhenxxx7/oracyne`).

## Edition Comparison

| Feature | Oracyne Open (`zhenxxx7/oracyne-open`) | Oracyne Platform (`zhenxxx7/oracyne`, Private) |
| --- | --- | --- |
| Voice Barge-In DSP & Pre-Roll Ring Buffer | Included (`src/lib/voice-barge-in.ts`, `src/lib/pcm-audio.ts`) | Included |
| Multilingual Speech Punctuation & TTS Segmentation | Included (`src/lib/transcript-punctuation.ts`, `src/lib/tts-language.ts`) | Included |
| 28-Language Neural Voice Catalog | Included (`src/lib/languages.ts`) | Included |
| Google Colab GPU Gateway Notebook | Included (`colab/oracyne_colab_llm.ipynb`) | Included + Auto-Lease Lifecycle Manager |
| Runnable Standalone Sandbox | Included (`npm install && npm start` on `:3100`) | Full Next.js 16 App Router SaaS (`:4142`) |
| Google OAuth, Verified Email & Turnstile Anti-Bot | Excluded | Full (`better-auth` + Turnstile + RBAC) |
| Admin Dashboard, Curriculum DB & Progress Tracking | Excluded | Full (Prisma SQLite / PostgreSQL) |

## Quickstart (3 Steps, Zero API Keys Required)

```bash
npm install
npm start
```

Open **`http://127.0.0.1:3100`** in your browser:
1. **Voice Barge-In & Punctuation Lab**: Test live microphone barge-in detection or press **Play Tutor Line** -> **Simulate User Interrupt** to inspect pre-roll WAV capture and adaptive vocal-formant gating, plus live transcript punctuation & TTS segmentation.
2. **Stateless Tutor Chat**: Runs immediately in **Local Demo Mode**, or connects to your own Google Colab GPU server when `COLAB_BASE_URL` is configured in `.env`.
3. **28 Languages & Voices**: Filter all 28 supported languages and consistent cross-language voice presets.

## Optional Colab GPU Connection

1. Copy `.env.example` to `.env`.
2. Open [colab/oracyne_colab_llm.ipynb](colab/oracyne_colab_llm.ipynb) in Google Colab on a T4 or L4 GPU runtime and start the server + HTTPS tunnel.
3. Set `COLAB_BASE_URL` (and `COLAB_API_KEY` if enabled) in `.env` and restart `npm start`.

## Verification Commands

- `npm run typecheck` — Strict TypeScript check (`tsc --noEmit`)
- `npm run build` — Bundles `src/client/app.ts` to `dist/client/app.js` with `esbuild`
- `npm test` — Runs unit tests (`voice-barge-in`, `transcript-punctuation`) and full live HTTP server integration tests (`open-server.test.ts`)

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md)
- [Voice Pipeline & Barge-In DSP](docs/VOICE_PIPELINE.md)
- [Google Colab GPU Notebook Guide](docs/COLAB_GPU.md)
- [Self-Hosting & Extending Guide](docs/SELF_HOSTING.md)
- [Security Policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
