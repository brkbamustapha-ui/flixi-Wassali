export type Lang = "dz" | "ar" | "fr" | "en";
export const DEFAULT_LANG: Lang = "dz";
export const LANG_COOKIE = "flixi_lang";

export const LANGS: { code: Lang; label: string; short: string }[] = [
  { code: "dz", label: "الدارجة", short: "دز" },
  { code: "ar", label: "العربية", short: "عربي" },
  { code: "fr", label: "Français", short: "FR" },
  { code: "en", label: "English", short: "EN" },
];

export const isLang = (v: unknown): v is Lang => v === "dz" || v === "ar" || v === "fr" || v === "en";
export const isRtl = (l: Lang) => l === "dz" || l === "ar";
export const htmlLang = (l: Lang) => (l === "dz" ? "ar-DZ" : l);
/** Locale pour les dates (chiffres latins, comme en Algérie) */
export const dateLocale = (l: Lang) => (l === "fr" ? "fr-DZ" : l === "en" ? "en-GB" : "ar-DZ-u-nu-latn");
