# Google Colab GPU Notebook Guide

Use [../colab/oracyne_colab_llm.ipynb](../colab/oracyne_colab_llm.ipynb) when you want real open-weight LLM inference, Faster-Whisper speech recognition, or neural Kokoro TTS running on a free or Pro Google Colab T4/L4 GPU.

## Steps

1. Upload `colab/oracyne_colab_llm.ipynb` to Google Colab.
2. Select **Runtime -> Change runtime type -> T4 GPU** (or **L4 GPU** on Colab Pro).
3. Run the notebook cells to start the OpenAI-compatible HTTP server and generate a public HTTPS tunnel (`https://...trycloudflare.com` or ngrok).
4. Copy the tunnel URL into your local `.env` file:
   ```env
   COLAB_BASE_URL="https://your-generated-tunnel.trycloudflare.com"
   COLAB_API_KEY="your-notebook-api-key"
   COLAB_MODEL="Qwen/Qwen2.5-7B-Instruct-AWQ"
   ```
5. Start `oracyne-open` with `npm start` — `GET /api/health` will report `"mode": "colab"`.

## Security Reminder

Never commit an active `trycloudflare.com` URL or `COLAB_API_KEY` into git history, and always stop idle Colab runtimes when finished to conserve compute units.
