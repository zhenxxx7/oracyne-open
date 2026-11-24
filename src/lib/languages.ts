export type SupportedLanguage = {
  value: string;
  label: string;
  nativeName: string;
  speechCode: string;
  neuralVoice: string;
};

export type TutorVoicePreset = "auto" | "ava" | "andrew" | "emma" | "brian";

export const DEFAULT_TUTOR_VOICE_PRESET: TutorVoicePreset = "ava";

export const TUTOR_VOICE_PRESETS: Array<{
  id: TutorVoicePreset;
  label: string;
  hint: string;
  voice?: string;
}> = [
  {
    id: "ava",
    label: "Ava · Same Voice All Languages (Default)",
    hint: "Consistent warm natural female voice across 40+ languages",
    voice: "en-US-AvaMultilingualNeural",
  },
  {
    id: "andrew",
    label: "Andrew · Same Voice All Languages (Male)",
    hint: "Consistent calm clear male voice across 40+ languages",
    voice: "en-US-AndrewMultilingualNeural",
  },
  {
    id: "emma",
    label: "Emma · Same Voice All Languages (Female)",
    hint: "Consistent friendly conversational female voice across 40+ languages",
    voice: "en-US-EmmaMultilingualNeural",
  },
  {
    id: "brian",
    label: "Brian · Same Voice All Languages (Male)",
    hint: "Consistent steady tutor male voice across 40+ languages",
    voice: "en-US-BrianMultilingualNeural",
  },
  {
    id: "auto",
    label: "Auto (Switch Regional Voice per Language)",
    hint: "Uses a different native speaker for each detected language",
  },
];

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { value: "English", label: "English", nativeName: "English", speechCode: "en-US", neuralVoice: "en-US-AvaMultilingualNeural" },
  { value: "Indonesian", label: "Indonesian", nativeName: "Bahasa Indonesia", speechCode: "id-ID", neuralVoice: "id-ID-GadisNeural" },
  { value: "Japanese", label: "Japanese", nativeName: "日本語", speechCode: "ja-JP", neuralVoice: "ja-JP-NanamiNeural" },
  { value: "Korean", label: "Korean", nativeName: "한국어", speechCode: "ko-KR", neuralVoice: "ko-KR-SunHiNeural" },
  { value: "Chinese", label: "Chinese (Mandarin)", nativeName: "中文 (普通话)", speechCode: "zh-CN", neuralVoice: "zh-CN-XiaoxiaoNeural" },
  { value: "Taiwanese Mandarin", label: "Taiwanese Mandarin", nativeName: "繁體中文", speechCode: "zh-TW", neuralVoice: "zh-TW-HsiaoChenNeural" },
  { value: "Cantonese", label: "Cantonese", nativeName: "廣東話", speechCode: "zh-HK", neuralVoice: "zh-HK-HiuMaanNeural" },
  { value: "Spanish", label: "Spanish", nativeName: "Español", speechCode: "es-ES", neuralVoice: "es-ES-ElviraNeural" },
  { value: "French", label: "French", nativeName: "Français", speechCode: "fr-FR", neuralVoice: "fr-FR-VivienneMultilingualNeural" },
  { value: "German", label: "German", nativeName: "Deutsch", speechCode: "de-DE", neuralVoice: "de-DE-SeraphinaMultilingualNeural" },
  { value: "Arabic", label: "Arabic", nativeName: "العربية", speechCode: "ar-SA", neuralVoice: "ar-SA-ZariyahNeural" },
  { value: "Hindi", label: "Hindi", nativeName: "हिन्दी", speechCode: "hi-IN", neuralVoice: "hi-IN-SwaraNeural" },
  { value: "Bengali", label: "Bengali", nativeName: "বাংলা", speechCode: "bn-IN", neuralVoice: "bn-IN-TanishaaNeural" },
  { value: "Thai", label: "Thai", nativeName: "ไทย", speechCode: "th-TH", neuralVoice: "th-TH-PremwadeeNeural" },
  { value: "Vietnamese", label: "Vietnamese", nativeName: "Tiếng Việt", speechCode: "vi-VN", neuralVoice: "vi-VN-HoaiMyNeural" },
  { value: "Malay", label: "Malay", nativeName: "Bahasa Melayu", speechCode: "ms-MY", neuralVoice: "ms-MY-YasminNeural" },
  { value: "Filipino", label: "Filipino", nativeName: "Tagalog", speechCode: "fil-PH", neuralVoice: "fil-PH-BlessicaNeural" },
  { value: "Javanese", label: "Javanese", nativeName: "Basa Jawa", speechCode: "jv-ID", neuralVoice: "jv-ID-SitiNeural" },
  { value: "Sundanese", label: "Sundanese", nativeName: "Basa Sunda", speechCode: "su-ID", neuralVoice: "su-ID-TutiNeural" },
  { value: "Portuguese", label: "Portuguese", nativeName: "Português", speechCode: "pt-BR", neuralVoice: "pt-BR-FranciscaNeural" },
  { value: "Italian", label: "Italian", nativeName: "Italiano", speechCode: "it-IT", neuralVoice: "it-IT-ElsaNeural" },
  { value: "Dutch", label: "Dutch", nativeName: "Nederlands", speechCode: "nl-NL", neuralVoice: "nl-NL-ColetteNeural" },
  { value: "Russian", label: "Russian", nativeName: "Русский", speechCode: "ru-RU", neuralVoice: "ru-RU-SvetlanaNeural" },
  { value: "Ukrainian", label: "Ukrainian", nativeName: "Українська", speechCode: "uk-UA", neuralVoice: "uk-UA-PolinaNeural" },
  { value: "Turkish", label: "Turkish", nativeName: "Türkçe", speechCode: "tr-TR", neuralVoice: "tr-TR-EmelNeural" },
  { value: "Polish", label: "Polish", nativeName: "Polski", speechCode: "pl-PL", neuralVoice: "pl-PL-ZofiaNeural" },
  { value: "Swedish", label: "Swedish", nativeName: "Svenska", speechCode: "sv-SE", neuralVoice: "sv-SE-SofieNeural" },
  { value: "Greek", label: "Greek", nativeName: "Ελληνικά", speechCode: "el-GR", neuralVoice: "el-GR-AthinaNeural" },
];

const LANGUAGE_ALIASES: Record<string, string> = {
  auto: "auto",
  mixed: "auto",
  bahasa: "id-ID",
  indonesia: "id-ID",
  indo: "id-ID",
  mandarin: "zh-CN",
  "chinese mandarin": "zh-CN",
  "chinese (mandarin)": "zh-CN",
  "中文 (普通话)": "zh-CN",
  zh: "zh-CN",
  "zh-cn": "zh-CN",
  taiwanese: "zh-TW",
  "zh-tw": "zh-TW",
  cantonese: "zh-HK",
  "zh-hk": "zh-HK",
  ja: "ja-JP",
  "ja-jp": "ja-JP",
  jp: "ja-JP",
  ko: "ko-KR",
  "ko-kr": "ko-KR",
  kr: "ko-KR",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  ar: "ar-SA",
  hi: "hi-IN",
  bn: "bn-IN",
  th: "th-TH",
  vi: "vi-VN",
  ms: "ms-MY",
  melayu: "ms-MY",
  tagalog: "fil-PH",
  fil: "fil-PH",
  tl: "fil-PH",
  jawa: "jv-ID",
  jv: "jv-ID",
  sunda: "su-ID",
  su: "su-ID",
  pt: "pt-BR",
  it: "it-IT",
  nl: "nl-NL",
  ru: "ru-RU",
  uk: "uk-UA",
  tr: "tr-TR",
  pl: "pl-PL",
  sv: "sv-SE",
  el: "el-GR",
};

export function findSupportedLanguage(language: string): SupportedLanguage | undefined {
  const normalized = language.trim().toLowerCase();
  if (!normalized) return undefined;

  const exactMatch = SUPPORTED_LANGUAGES.find((item) =>
    [item.value, item.label, item.nativeName, item.speechCode].some(
      (candidate) => candidate.toLowerCase() === normalized,
    ),
  );
  if (exactMatch) return exactMatch;

  const aliasCode = LANGUAGE_ALIASES[normalized];
  if (aliasCode && aliasCode !== "auto") {
    const byAlias = SUPPORTED_LANGUAGES.find((item) => item.speechCode.toLowerCase() === aliasCode.toLowerCase());
    if (byAlias) return byAlias;
  }

  const base = normalized.split("-")[0];
  const byBase = SUPPORTED_LANGUAGES.find(
    (item) =>
      item.speechCode.toLowerCase().split("-")[0] === base ||
      normalized.startsWith(item.value.toLowerCase()) ||
      normalized.startsWith(item.label.toLowerCase()),
  );
  return byBase;
}

export function getSpeechLanguageCode(language: string) {
  const normalized = language.trim().toLowerCase();

  if (!normalized || normalized === "auto" || normalized === "mixed") {
    return normalized === "auto" || normalized === "mixed" ? "auto" : "en-US";
  }

  if (LANGUAGE_ALIASES[normalized]) {
    return LANGUAGE_ALIASES[normalized];
  }

  const matched = findSupportedLanguage(language);
  return matched?.speechCode ?? language;
}

export function getNeuralVoiceForLanguage(language?: string, preset: TutorVoicePreset = "auto"): string {
  const presetEntry = TUTOR_VOICE_PRESETS.find((item) => item.id === preset);
  if (preset !== "auto" && presetEntry?.voice) {
    return presetEntry.voice;
  }

  const normalized = language?.trim().toLowerCase() ?? "";
  if (!normalized || normalized === "auto" || normalized === "mixed") {
    return "en-US-AvaMultilingualNeural";
  }

  const matched = findSupportedLanguage(normalized);
  return matched?.neuralVoice ?? "en-US-AvaMultilingualNeural";
}
