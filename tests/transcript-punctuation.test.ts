import assert from "node:assert/strict";
import test from "node:test";
import { punctuateBrowserTranscript } from "../src/lib/transcript-punctuation";

test("punctuateBrowserTranscript adds natural capitalization, discourse commas, and question marks", () => {
  assert.equal(punctuateBrowserTranscript("   "), "");

  // English questions & statements
  assert.equal(
    punctuateBrowserTranscript("what did you order today", "en-US"),
    "What did you order today?",
  );
  assert.equal(
    punctuateBrowserTranscript("wait can we talk about coffee instead", "en-US"),
    "Wait, can we talk about coffee instead?",
  );
  assert.equal(
    punctuateBrowserTranscript("hello i want to practice english today", "en-US"),
    "Hello, i want to practice english today.",
  );
  assert.equal(
    punctuateBrowserTranscript("you like iced coffee right", "en-US"),
    "You like iced coffee, right?",
  );

  // Indonesian / Malay conversational phrases & questions
  assert.equal(
    punctuateBrowserTranscript("tunggu kenapa kita tidak mulai dari topik baru", "id-ID"),
    "Tunggu, kenapa kita tidak mulai dari topik baru?",
  );
  assert.equal(
    punctuateBrowserTranscript("halo hari ini aku mau ngobrol santai", "id-ID"),
    "Halo, hari ini aku mau ngobrol santai.",
  );
  assert.equal(
    punctuateBrowserTranscript("kamu bisa gak jelasin lagi", "id-ID"),
    "Kamu bisa gak jelasin lagi?",
  );

  // CJK transcripts
  assert.equal(punctuateBrowserTranscript("今天我们聊什么", "zh-CN"), "今天我们聊什么？");
  assert.equal(punctuateBrowserTranscript("今日は元気です", "ja-JP"), "今日は元気です。");
  assert.equal(punctuateBrowserTranscript("今日は何を食べますか", "ja-JP"), "今日は何を食べますか？");

  // Preserves already-punctuated text untouched
  assert.equal(
    punctuateBrowserTranscript("Hey, could you repeat that, please?", "en-US"),
    "Hey, could you repeat that, please?",
  );
});
