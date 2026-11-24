import fs from "node:fs";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUPPORTED_LANGUAGES, TUTOR_VOICE_PRESETS, getSpeechLanguageCode } from "./lib/languages";
import { punctuateBrowserTranscript } from "./lib/transcript-punctuation";
import { detectTtsLanguage, splitTtsSegments } from "./lib/tts-language";

export type OpenServerOptions = {
  rootDir?: string;
  colabBaseUrl?: string;
  colabApiKey?: string;
  colabModel?: string;
};

const MAX_BODY_BYTES = 64 * 1024;

function loadDotEnv(rootDir: string) {
  const envPath = path.join(rootDir, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex <= 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const val = trimmed.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
}

function sendJson(res: ServerResponse, status: number, payload: unknown) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
  });
  res.end(body);
}

function sendFile(res: ServerResponse, filePath: string, contentType: string) {
  if (!fs.existsSync(filePath)) {
    sendJson(res, 404, { error: "Asset not found. Run npm run build first." });
    return;
  }
  const data = fs.readFileSync(filePath);
  res.writeHead(200, {
    "Content-Type": `${contentType}; charset=utf-8`,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  });
  res.end(data);
}

async function readJsonBody<T>(req: IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("Payload exceeds 64 KB limit."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8").trim();
        resolve((raw ? JSON.parse(raw) : {}) as T);
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });

    req.on("error", reject);
  });
}

function generateLocalDemoReply(punctuatedInput: string, language: string, speechCode: string) {
  const lower = punctuatedInput.toLowerCase();

  if (speechCode.startsWith("id")) {
    return {
      reply: `Mantap! Kalimat kamu terdengar alami: "${punctuatedInput}". Coba lanjutkan satu kalimat lagi tentang rencanamu hari ini, ya?`,
      tip: "Gunakan nada naik di akhir kalimat tanya seperti '...hari ini, ya?' agar terdengar lebih santai.",
    };
  }

  if (speechCode.startsWith("ja")) {
    return {
      reply: `いいですね！「${punctuatedInput}」はとても自然です。次はもう少し詳しく教えてくれますか？`,
      tip: "文末を「〜ますか」「〜ですね」で整えると会話がスムーズになります。",
    };
  }

  if (lower.includes("coffee") || lower.includes("order")) {
    return {
      reply: `Great phrasing! Saying "${punctuatedInput}" works nicely at a cafe. Would you like to practice asking about size or oat milk next?`,
      tip: `Polite cafe add-on: "Could I get an iced oat latte, please?"`,
    };
  }

  return {
    reply: `Nice speaking practice in ${language}! I heard: "${punctuatedInput}". Could you add one more detail or follow-up question so we keep the flow going?`,
    tip: "Short 8–15 word conversational turns help speech recognition and natural rhythm.",
  };
}

async function queryColabChat(
  colabBaseUrl: string,
  colabApiKey: string,
  colabModel: string,
  punctuatedInput: string,
  language: string,
) {
  const endpoint = `${colabBaseUrl.replace(/\/+$/, "")}/v1/chat/completions`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (colabApiKey) {
    headers.Authorization = `Bearer ${colabApiKey}`;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(12000),
    body: JSON.stringify({
      model: colabModel,
      temperature: 0.6,
      max_tokens: 180,
      messages: [
        {
          role: "system",
          content: `You are Oracyne Open Sandbox, a concise, friendly conversational language tutor for ${language}. Reply in 1-2 natural spoken sentences.`,
        },
        {
          role: "user",
          content: punctuatedInput,
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`Colab endpoint returned HTTP ${res.status}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    throw new Error("Colab endpoint returned an empty message.");
  }
  return reply;
}

export function createOracyneOpenServer(options: OpenServerOptions = {}) {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = options.rootDir ?? path.resolve(currentDir, "..");
  loadDotEnv(rootDir);

  const colabBaseUrl = (options.colabBaseUrl ?? process.env.COLAB_BASE_URL ?? "").trim();
  const colabApiKey = (options.colabApiKey ?? process.env.COLAB_API_KEY ?? "").trim();
  const colabModel = (options.colabModel ?? process.env.COLAB_MODEL ?? "Qwen/Qwen2.5-7B-Instruct-AWQ").trim();

  return http.createServer(async (req, res) => {
    const method = req.method ?? "GET";
    const urlPath = (req.url ?? "/").split("?")[0];

    try {
      if (method === "GET" && urlPath === "/") {
        sendFile(res, path.join(rootDir, "public", "index.html"), "text/html");
        return;
      }

      if (method === "GET" && urlPath === "/styles.css") {
        sendFile(res, path.join(rootDir, "public", "styles.css"), "text/css");
        return;
      }

      if (method === "GET" && urlPath === "/app.js") {
        sendFile(res, path.join(rootDir, "dist", "client", "app.js"), "application/javascript");
        return;
      }

      if (method === "GET" && urlPath === "/api/health") {
        sendJson(res, 200, {
          ok: true,
          edition: "community-limited",
          mode: colabBaseUrl ? "colab" : "local-demo",
          languages: SUPPORTED_LANGUAGES.length,
        });
        return;
      }

      if (method === "GET" && urlPath === "/api/languages") {
        sendJson(res, 200, {
          languages: SUPPORTED_LANGUAGES,
          presets: TUTOR_VOICE_PRESETS,
        });
        return;
      }

      if (method === "POST" && urlPath === "/api/punctuate") {
        const body = await readJsonBody<{ text?: string; language?: string }>(req);
        const text = typeof body.text === "string" ? body.text : "";
        if (!text.trim()) {
          sendJson(res, 400, { error: "Field 'text' is required." });
          return;
        }
        const language = typeof body.language === "string" && body.language.trim() ? body.language.trim() : "English";
        const fallbackCode = getSpeechLanguageCode(language);
        const punctuated = punctuateBrowserTranscript(text, fallbackCode === "auto" ? undefined : fallbackCode);
        const detectedSpeechCode = detectTtsLanguage(punctuated, fallbackCode);
        const segments = splitTtsSegments(punctuated, detectedSpeechCode);

        sendJson(res, 200, {
          original: text,
          punctuated,
          detectedSpeechCode,
          segments,
        });
        return;
      }

      if (method === "POST" && urlPath === "/api/chat") {
        const body = await readJsonBody<{ message?: string; language?: string }>(req);
        const message = typeof body.message === "string" ? body.message.trim() : "";
        if (!message) {
          sendJson(res, 400, { error: "Field 'message' is required." });
          return;
        }
        const language = typeof body.language === "string" && body.language.trim() ? body.language.trim() : "English";
        const fallbackCode = getSpeechLanguageCode(language);
        const punctuated = punctuateBrowserTranscript(message, fallbackCode === "auto" ? undefined : fallbackCode);
        const detectedSpeechCode = detectTtsLanguage(punctuated, fallbackCode);

        if (colabBaseUrl) {
          try {
            const reply = await queryColabChat(colabBaseUrl, colabApiKey, colabModel, punctuated, language);
            sendJson(res, 200, {
              mode: "colab",
              input: punctuated,
              reply,
              tip: "Powered by your connected Google Colab GPU endpoint.",
              speechCode: detectTtsLanguage(reply, detectedSpeechCode),
            });
            return;
          } catch (err) {
            const demo = generateLocalDemoReply(punctuated, language, detectedSpeechCode);
            sendJson(res, 200, {
              mode: "local-demo-fallback",
              warning: err instanceof Error ? err.message : "Colab fallback active.",
              input: punctuated,
              reply: demo.reply,
              tip: demo.tip,
              speechCode: detectedSpeechCode,
            });
            return;
          }
        }

        const demo = generateLocalDemoReply(punctuated, language, detectedSpeechCode);
        sendJson(res, 200, {
          mode: "local-demo",
          input: punctuated,
          reply: demo.reply,
          tip: demo.tip,
          speechCode: detectedSpeechCode,
        });
        return;
      }

      sendJson(res, 404, { error: "Route not found in Oracyne Limited Edition." });
    } catch (err) {
      sendJson(res, 400, { error: err instanceof Error ? err.message : "Bad request." });
    }
  });
}

const isEntrypoint =
  Boolean(process.argv[1]) && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isEntrypoint) {
  const port = Number(process.env.PORT ?? 3100) || 3100;
  const server = createOracyneOpenServer();
  server.listen(port, "127.0.0.1", () => {
    console.log(`[oracyne-open] Limited Voice Sandbox running at http://127.0.0.1:${port}`);
  });
}
