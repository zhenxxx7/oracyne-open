import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { createOracyneOpenServer } from "../src/server";

test("Oracyne Open limited server serves UI, bundled JS, health, languages, punctuation, and local demo chat", async () => {
  const server = createOracyneOpenServer({ colabBaseUrl: "" });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));

  try {
    const addr = server.address() as AddressInfo;
    const base = `http://127.0.0.1:${addr.port}`;

    const htmlRes = await fetch(`${base}/`);
    assert.equal(htmlRes.status, 200);
    const html = await htmlRes.text();
    assert.ok(html.includes("Oracyne AI Voice Sandbox"));

    const jsRes = await fetch(`${base}/app.js`);
    assert.equal(jsRes.status, 200);
    const jsText = await jsRes.text();
    assert.ok(jsText.length > 500, "Expected bundled /app.js asset");

    const healthRes = await fetch(`${base}/api/health`);
    assert.equal(healthRes.status, 200);
    const health = (await healthRes.json()) as {
      ok: boolean;
      edition: string;
      mode: string;
      languages: number;
    };
    assert.equal(health.ok, true);
    assert.equal(health.edition, "community-limited");
    assert.equal(health.mode, "local-demo");
    assert.equal(health.languages, 28);

    const langsRes = await fetch(`${base}/api/languages`);
    assert.equal(langsRes.status, 200);
    const langs = (await langsRes.json()) as { languages: unknown[]; presets: unknown[] };
    assert.equal(langs.languages.length, 28);
    assert.ok(langs.presets.length >= 4);

    const punctRes = await fetch(`${base}/api/punctuate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: "tunggu kenapa kita tidak mulai dari topik baru",
        language: "Indonesian",
      }),
    });
    assert.equal(punctRes.status, 200);
    const punct = (await punctRes.json()) as { punctuated: string; detectedSpeechCode: string };
    assert.equal(punct.punctuated, "Tunggu, kenapa kita tidak mulai dari topik baru?");
    assert.equal(punct.detectedSpeechCode, "id-ID");

    const chatRes = await fetch(`${base}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "can i order an iced coffee please",
        language: "English",
      }),
    });
    assert.equal(chatRes.status, 200);
    const chat = (await chatRes.json()) as { mode: string; input: string; reply: string; speechCode: string };
    assert.equal(chat.mode, "local-demo");
    assert.equal(chat.input, "Can i order an iced coffee please?");
    assert.ok(chat.reply.length > 10);
    assert.equal(chat.speechCode, "en-US");
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
});
