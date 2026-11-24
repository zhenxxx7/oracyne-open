const TERMINAL_PUNCTUATION_RE = /[.?!。？！]$/;
const CJK_CHAR_RE = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/;
const JP_CHAR_RE = /[\u3040-\u30ff]/;
const KO_CHAR_RE = /[\uac00-\ud7af]/;

const DISCOURSE_MARKERS = [
  "excuse me",
  "sebenarnya",
  "actually",
  "tunggu",
  "permisi",
  "hello",
  "sorry",
  "please",
  "wait",
  "halo",
  "maaf",
  "okay",
  "well",
  "jadi",
  "hey",
  "hai",
  "oke",
  "nah",
  "hi",
  "oh",
  "um",
  "eh",
  "ok",
];

const ENGLISH_QUESTION_STARTERS = new Set([
  "what",
  "what's",
  "why",
  "why's",
  "how",
  "how's",
  "when",
  "where",
  "where's",
  "who",
  "who's",
  "whom",
  "whose",
  "which",
  "can",
  "can't",
  "could",
  "couldn't",
  "would",
  "wouldn't",
  "will",
  "won't",
  "shall",
  "should",
  "do",
  "does",
  "doesn't",
  "don't",
  "did",
  "didn't",
  "is",
  "isn't",
  "are",
  "aren't",
  "am",
  "was",
  "were",
  "have",
  "has",
  "had",
  "may",
  "might",
]);

const ID_QUESTION_MARKERS = new Set([
  "apa",
  "apakah",
  "kenapa",
  "mengapa",
  "bagaimana",
  "gimana",
  "kapan",
  "dimana",
  "kemana",
  "siapa",
  "berapa",
  "bolehkah",
  "bisakah",
]);

function isCjkTranscript(text: string, language?: string): boolean {
  const lang = (language ?? "").toLowerCase();
  if (/^(zh|ja|ko)/.test(lang)) return true;
  return CJK_CHAR_RE.test(text);
}

function isSpokenQuestion(body: string, language?: string): boolean {
  const lower = body.toLowerCase().trim();
  const lang = (language ?? "").toLowerCase();

  if (CJK_CHAR_RE.test(body) || /^(zh|ja|ko)/.test(lang)) {
    if (KO_CHAR_RE.test(body) || lang.startsWith("ko")) {
      return /(?:까|나요|가요|인가요|에요)$/.test(body) && /(?:뭐|왜|어떻게|어디|언제|누구|무엇|까|나요|가요)/.test(body);
    }
    if (JP_CHAR_RE.test(body) || lang.startsWith("ja")) {
      if (/(?:ですか|ますか|かな|か)$/.test(body)) return true;
      return /の$/.test(body) && /(?:何|どう|なぜ|どこ|だれ|誰|いつ)/.test(body);
    }
    return /[吗呢]|(?:什么|怎麼|怎么|为什么|為什麼|哪|几|幾|谁|誰|多少)/.test(body);
  }

  // Strip optional leading discourse marker + comma when checking question starters.
  const stripped = lower.replace(/^[a-z\u00c0-\u024f'’]+(?:\s+[a-z\u00c0-\u024f'’]+)?,\s*/i, "").trim();
  const words = stripped.split(/\s+/).filter(Boolean);
  const firstWord = words[0]?.replace(/^["'¿¡]+|[,;:'"]+$/g, "") ?? "";

  if (ENGLISH_QUESTION_STARTERS.has(firstWord) || ID_QUESTION_MARKERS.has(firstWord)) {
    return true;
  }

  if (/kah$/.test(firstWord) && firstWord.length > 3) {
    return true;
  }

  if (/^(?:di|ke|dari) mana\b/.test(stripped) || /\b(?:bisa gak|bisa nggak|bisa tidak|mau gak|mau nggak|ya kan)\b/.test(lower)) {
    return true;
  }

  if (/(?:,\s*right|isn't it|don't you|can you|could you|will you|bukan|kan)$/.test(lower)) {
    return true;
  }

  return false;
}

/**
 * Add natural capitalization, discourse commas, and sentence-ending `.` / `?`
 * to unpunctuated browser Web Speech transcripts without altering already-punctuated text.
 */
export function punctuateBrowserTranscript(raw: string, language?: string): string {
  const normalized = raw.replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  if (TERMINAL_PUNCTUATION_RE.test(normalized)) {
    return normalized;
  }

  const cjk = isCjkTranscript(normalized, language);
  let formatted = normalized;

  if (!cjk) {
    const markerPattern = DISCOURSE_MARKERS.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const leadingRe = new RegExp(`^(${markerPattern})\\s+(.+)$`, "i");
    const leadingMatch = formatted.match(leadingRe);
    if (leadingMatch && !leadingMatch[1].endsWith(",")) {
      formatted = `${leadingMatch[1]}, ${leadingMatch[2]}`;
    }

    // Add comma before trailing conversational tags if missing.
    formatted = formatted.replace(/\s+(right|isn't it|don't you|can you|could you|will you|ya kan)$/i, ", $1");

    // Capitalize first alphabetical character.
    formatted = formatted.replace(/[a-z\u00c0-\u024f]/i, (ch) => ch.toUpperCase());
  }

  const question = isSpokenQuestion(formatted, language);
  if (cjk && !KO_CHAR_RE.test(formatted) && !/^ko/i.test(language ?? "")) {
    return `${formatted}${question ? "？" : "。"}`;
  }
  return `${formatted}${question ? "?" : "."}`;
}
