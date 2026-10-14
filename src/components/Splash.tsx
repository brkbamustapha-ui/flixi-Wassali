"use client";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { INTRO_SESSION_KEY } from "@/lib/intro";
import { useI18n } from "@/lib/i18n";
import { LogoIntro } from "./LogoIntro";
import { introSoundPlayed, playIntroSound } from "@/lib/introSound";

/* --- état partagé (comme un rideau d'ouverture : joué une fois par session) --- */
type IntroState = "playing" | "done";
let finished = false;
const listeners = new Set<() => void>();
const introStore = {
  subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); },
  getSnapshot(): IntroState { return finished || document.documentElement.dataset.intro === "skip" ? "done" : "playing"; },
  getServerSnapshot(): IntroState { return "playing"; },
  finish() {
    if (finished) return;
    finished = true;
    try { sessionStorage.setItem(INTRO_SESSION_KEY, "1"); } catch {}
    listeners.forEach((l) => l());
  },
};

/**
 * Rideau d'ouverture : le logo se construit élément par élément, puis le rideau se lève sur le site.
 * Joué une fois par session, passable d'un clic ou d'une touche.
 */
export default function Splash() {
  const done = useSyncExternalStore(introStore.subscribe, introStore.getSnapshot, introStore.getServerSnapshot) === "done";
  const reduce = useReducedMotion();
  const { t } = useI18n();
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  mutedRef.current = muted;

  useEffect(() => {
    if (done) return;
    const root = document.documentElement;
    root.style.overflow = "hidden";
    if (!reduce) playIntroSound().then((ok) => { if (!ok) setMuted(true); });
    const safety = window.setTimeout(introStore.finish, reduce ? 500 : 15000);
    window.addEventListener("keydown", introStore.finish, { once: true });
    return () => {
      window.clearTimeout(safety);
      window.removeEventListener("keydown", introStore.finish);
      root.style.overflow = "";
    };
  }, [done, reduce]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="intro"
          className="intro-overlay fixed inset-0 z-[9999] flex cursor-pointer items-center justify-center"
          style={{ background: "radial-gradient(900px 620px at 50% 42%, #3a1a70 0%, #1a1233 58%, #100a22 100%)" }}
          onClick={() => { if (!introSoundPlayed()) { playIntroSound().then((ok) => { if (ok) { setMuted(false); window.setTimeout(introStore.finish, 2800); } else introStore.finish(); }); } else introStore.finish(); }}
          initial={{ clipPath: "inset(0 0 0% 0)" }}
          exit={{ clipPath: "inset(0 0 100% 0)" }}
          transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }}
          role="presentation"
        >
          {/* halos de couleur */}
          <div aria-hidden className="pointer-events-none absolute left-[8%] top-[8%] h-[46vmin] w-[46vmin] rounded-full bg-[#ff7a1a] opacity-30 blur-[90px]" />
          <div aria-hidden className="pointer-events-none absolute bottom-[6%] right-[6%] h-[52vmin] w-[52vmin] rounded-full bg-[#ff2e7e] opacity-30 blur-[90px]" />
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-[50vmin] w-[90vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(123_63_242/0.28),transparent)]" />

          <LogoIntro delay={0.15} onDone={() => window.setTimeout(() => { if (!mutedRef.current) introStore.finish(); }, 250)} />

          <span className="absolute bottom-8 text-[11px] font-bold uppercase tracking-[0.3em] text-white/45">{muted ? "🔊 " + t("Toucher pour activer le son") : t("Toucher pour entrer")}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
