"use client";
import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";
import { DICT } from "./dict";
import { DEFAULT_LANG, LANG_COOKIE, Lang, dateLocale, htmlLang, isRtl } from "./config";
import { findWilaya } from "@/lib/wilayas";

type Vars = Record<string, string | number>;
type Ctx = {
  lang: Lang;
  rtl: boolean;
  setLang: (l: Lang) => void;
  /** Traduit une phrase française (la clé) ; remplace {variables}. */
  t: (fr: string, vars?: Vars) => string;
  /** Nom de wilaya dans la langue courante */
  w: (name?: string | null) => string;
  date: (d?: string | null) => string;
  dateTime: (d?: string | null) => string;
};

const I18nCtx = createContext<Ctx | null>(null);

const fill = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`)) : s);

export function I18nProvider({ initial, children }: { initial: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial ?? DEFAULT_LANG);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(LANG_COOKIE, l); } catch {}
    document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    const el = document.documentElement;
    el.lang = htmlLang(l);
    el.dir = isRtl(l) ? "rtl" : "ltr";
  }, []);

  const value = useMemo<Ctx>(() => {
    const idx = lang === "en" ? 0 : lang === "ar" ? 1 : 2;
    const loc = dateLocale(lang);
    return {
      lang,
      rtl: isRtl(lang),
      setLang,
      t: (fr, vars) => fill(lang === "fr" ? fr : (DICT[fr]?.[idx] ?? fr), vars),
      w: (name) => {
        const wl = findWilaya(name);
        if (!wl) return name ?? "";
        return lang === "ar" || lang === "dz" ? wl.ar : wl.name;
      },
      date: (d) => (d ? new Date(d).toLocaleDateString(loc, { day: "2-digit", month: "short", year: "numeric" }) : "-"),
      dateTime: (d) => (d ? new Date(d).toLocaleString(loc, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-"),
    };
  }, [lang, setLang]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const c = useContext(I18nCtx);
  if (!c) throw new Error("useI18n hors I18nProvider");
  return c;
}
