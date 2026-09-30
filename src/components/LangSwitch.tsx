"use client";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { LANGS } from "@/lib/i18n/config";

/** Sélecteur de langue : الدارجة (Oran) · العربية · Français · English */
export default function LangSwitch({ dark = false }: { dark?: boolean }) {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cur = LANGS.find((l) => l.code === lang)!;

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className="relative" dir="ltr">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} aria-label="Language"
        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-bold transition ${dark ? "border-white/25 text-white hover:bg-white/10" : "border-violet-200 bg-white text-ink hover:border-brand-violet"}`}>
        <span aria-hidden>🌐</span>{cur.short}
      </button>
      {open && (
        <ul role="listbox" className="absolute end-0 z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-violet-100 bg-white py-1 shadow-xl">
          {LANGS.map((l) => (
            <li key={l.code}>
              <button type="button" role="option" aria-selected={l.code === lang} onClick={() => { setLang(l.code); setOpen(false); }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-sm font-bold hover:bg-violet-50 ${l.code === lang ? "text-brand-pink" : "text-ink"}`}>
                <span>{l.label}</span>{l.code === lang && <span>✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
