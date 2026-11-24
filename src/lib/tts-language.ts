import { getSpeechLanguageCode } from "./languages";

const SCRIPT_MATCHERS: Array<{ pattern: RegExp; language: string }> = [
  { pattern: /[\u3040-\u30ff]/, language: "ja-JP" },
  { pattern: /[\uac00-\ud7af]/, language: "ko-KR" },
  { pattern: /[\u4e00-\u9fff]/, language: "zh-CN" },
  { pattern: /[\u0600-\u06ff]/, language: "ar-SA" },
  { pattern: /[\u0900-\u097f]/, language: "hi-IN" },
  { pattern: /[\u0980-\u09ff]/, language: "bn-IN" },
  { pattern: /[\u0e00-\u0e7f]/, language: "th-TH" },
  { pattern: /[\u0370-\u03ff]/, language: "el-GR" },
  { pattern: /[іїєґІЇЄҐ]/, language: "uk-UA" },
  { pattern: /[\u0400-\u04ff]/, language: "ru-RU" },
];

const WORD_HINTS: Record<string, string[]> = {
  "id-ID": [
    "adalah", "agar", "akan", "aku", "anda", "apa", "atau", "bahasa", "banget", "bisa",
    "buat", "dalam", "dan", "dari", "dengan", "dia", "enggak", "gimana", "harus", "gunakan",
    "ini", "itu", "kalimat", "jadi", "jangan", "juga", "kalau", "kamu", "karena", "ke",
    "lebih", "maksud", "mau", "nggak", "pakai", "salah", "saya", "seperti", "suara",
    "terdengar", "tetap", "tidak", "untuk", "yang",
  ],
  "en-US": [
    "about", "after", "and", "because", "correct", "day", "english", "for", "how",
    "learn", "me", "practice", "repeat", "speak", "teacher", "that", "the", "this",
    "to", "what", "with", "you",
  ],
  "ms-MY": ["awak", "bagaimana", "boleh", "cikgu", "hendak", "kerana", "macam", "mahukan", "perlu", "sedang", "tidakkah"],
  "fil-PH": ["ako", "ang", "ba", "ikaw", "kasi", "ko", "kumusta", "mga", "naman", "ng", "para", "po", "salamat", "siya"],
  "jv-ID": ["aku", "apik", "kowe", "ngendi", "ora", "piye", "sampeyan", "sapa", "sing", "wis"],
  "su-ID": ["abdi", "anjeun", "atos", "kumaha", "naon", "nuhun", "saha", "sareng", "teu"],
  "es-ES": ["como", "con", "de", "el", "ella", "en", "es", "gracias", "hola", "para", "pero", "por", "que", "una"],
  "fr-FR": ["avec", "bonjour", "ce", "dans", "des", "est", "et", "je", "le", "les", "merci", "pour", "que", "une"],
  "de-DE": ["aber", "auf", "das", "der", "die", "ein", "eine", "ich", "ist", "mit", "nicht", "und", "was"],
  "it-IT": ["che", "ciao", "con", "di", "e", "grazie", "il", "la", "non", "per", "sono", "un", "una"],
  "pt-BR": ["com", "de", "e", "estou", "nao", "não", "obrigado", "para", "por", "que", "uma", "voce", "você"],
  "nl-NL": ["als", "dat", "de", "een", "en", "het", "ik", "met", "niet", "van", "voor", "zijn"],
  "vi-VN": ["ban", "bạn", "cam", "cảm", "chao", "chào", "khong", "không", "la", "là", "mot", "một", "toi", "tôi", "va", "và"],
  "tr-TR": ["ben", "bir", "bu", "cok", "çok", "evet", "gibi", "icin", "için", "merhaba", "nasil", "nasıl", "tesekkur", "teşekkür", "ve"],
  "pl-PL": ["ale", "bardzo", "czy", "czesc", "cześć", "dla", "dziekuje", "dziękuję", "jest", "jak", "nie", "tak", "to"],
  "sv-SE": ["att", "det", "en", "ett", "for", "för", "hej", "inte", "jag", "med", "och", "som", "tack"],
};

function countHints(words: string[], hints: string[]) {
  return words.reduce((score, word) => score + (hints.includes(word) ? 1 : 0), 0);
}

export function normalizeTtsLanguage(language?: string) {
  const trimmed = language?.trim();
  if (!trimmed) return "en-US";
  return getSpeechLanguageCode(trimmed);
}

export function detectTtsLanguage(text: string, fallbackLanguage = "en-US") {
  const fallback = normalizeTtsLanguage(fallbackLanguage);
  const trimmed = text.trim();

  if (!trimmed) {
    return fallback === "auto" ? "en-US" : fallback;
  }

  for (const matcher of SCRIPT_MATCHERS) {
    if (matcher.pattern.test(trimmed)) {
      return matcher.language;
    }
  }

  // Vietnamese tonal diacritics check
  if (/[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i.test(trimmed)) {
    return "vi-VN";
  }

  // Turkish-specific letters
  if (/[ğüşöçıİĞÜŞÖÇ]/.test(trimmed) && !/[äöüß]/i.test(trimmed)) {
    return "tr-TR";
  }

  // Polish-specific letters
  if (/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(trimmed)) {
    return "pl-PL";
  }

  const words =
    trimmed
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .match(/[a-z']+/g) ?? [];

  const scores = Object.entries(WORD_HINTS)
    .map(([language, hints]) => ({ language, score: countHints(words, hints) }))
    .sort((left, right) => right.score - left.score);
  const best = scores[0];
  const second = scores[1];

  if (best && best.score >= 1 && best.score >= (second?.score ?? 0) + 1) {
    return best.language;
  }

  return fallback === "auto" ? "en-US" : fallback;
}

function splitLongSegment(text: string, maxLength: number) {
  if (text.length <= maxLength) {
    return [text];
  }

  const parts = text.split(/([,;:])/);
  const chunks: string[] = [];
  let current = "";

  for (let index = 0; index < parts.length; index += 1) {
    const next = `${parts[index]}${parts[index + 1] ?? ""}`.trim();
    if (!next) continue;

    if (current && `${current} ${next}`.length > maxLength) {
      chunks.push(current);
      current = next;
    } else {
      current = current ? `${current} ${next}` : next;
    }

    if (parts[index + 1]) index += 1;
  }

  if (current) {
    chunks.push(current);
  }

  if (chunks.some((chunk) => chunk.length > maxLength)) {
    return chunks.flatMap((chunk) => {
      if (chunk.length <= maxLength) return [chunk];
      const words = chunk.split(/\s+/);
      const wordChunks: string[] = [];
      let currentWords = "";
      for (const word of words) {
        if (currentWords && `${currentWords} ${word}`.length > maxLength) {
          wordChunks.push(currentWords);
          currentWords = word;
        } else {
          currentWords = currentWords ? `${currentWords} ${word}` : word;
        }
      }
      if (currentWords) wordChunks.push(currentWords);
      return wordChunks;
    });
  }

  return chunks;
}

export function splitTtsSegments(text: string, fallbackLanguage = "en-US") {
  const cleanText = text.replace(/\s+/g, " ").trim();
  if (!cleanText) {
    return [];
  }

  const sentenceMatches = cleanText.match(/[^.!?。！？]+[.!?。！？]?/g) ?? [cleanText];
  const rawSegments = sentenceMatches.flatMap((sentence) => splitLongSegment(sentence.trim(), 220));

  return rawSegments
    .map((segment) => ({
      text: segment,
      language: detectTtsLanguage(segment, fallbackLanguage),
    }))
    .filter((segment) => segment.text.length > 0);
}
