# Contributing to Oracyne Open

Thank you for helping improve the open-source voice DSP, punctuation rules, language catalog, and Colab GPU tooling!

## Development Workflow

1. Fork `zhenxxx7/oracyne-open` and clone locally.
2. Install dev dependencies (`npm install`).
3. Make focused edits under `src/`, `public/`, `docs/`, or `tests/`.
4. Verify everything passes before opening a pull request:
   ```bash
   npm run typecheck
   npm test
   ```

## Guidelines

- Keep all `src/lib/*` modules dependency-free and portable between browser bundles and Node.js.
- Add unit tests under `tests/` for any new punctuation rules, DSP thresholds, or language aliases.
- Do not include hardcoded API keys or live tunnel URLs in notebooks or documentation.
