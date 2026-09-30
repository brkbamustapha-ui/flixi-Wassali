"use client";
import { useEffect, useState } from "react";

const KEY = "flixi_splash_seen";

/** Écran d'intro animé : le logo apparaît à l'ouverture du site / de l'appli (une fois par session). */
export default function Splash() {
  const [phase, setPhase] = useState<"show" | "out" | "gone">("show");

  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(KEY) === "1"; sessionStorage.setItem(KEY, "1"); } catch {}
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen) return setPhase("gone");
    const t1 = setTimeout(() => setPhase("out"), reduced ? 600 : 3700);
    const t2 = setTimeout(() => setPhase("gone"), reduced ? 900 : 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  if (phase === "gone") return null;
  const sparks = [[12, 70, -20, 0.4], [22, 30, 30, 1.1], [33, 82, -10, 1.7], [45, 18, 20, 0.7], [58, 76, -30, 1.4], [68, 26, 10, 2.0], [78, 64, 25, 0.2], [88, 40, -15, 1.0], [8, 48, 15, 1.9], [92, 78, -25, 0.6]];
  const letters = "Flixi".split("");
  const letters2 = "Tawsil".split("");

  return (
    <div className={`splash ${phase === "out" ? "splash-out" : ""}`} aria-hidden="true">
      <div className="splash-orb splash-orb-a" />
      <div className="splash-orb splash-orb-b" />
      <div className="splash-orb splash-orb-c" />

      {sparks.map(([l, t, dx, d], i) => (
        <span key={i} className="spark" style={{ left: `${l}%`, top: `${t}%`, ["--dx" as string]: `${dx}px`, animationDelay: `${d}s` }} />
      ))}

      <div className="splash-stage">
        <span className="splash-glow" />
        <div className="splash-logo">
          <span className="splash-ring" />
          <span className="splash-ring splash-ring-2" />
          <svg viewBox="0 0 100 100" width="132" height="132" className="splash-icon">
            <defs>
              <linearGradient id="sg" x1="8" y1="6" x2="94" y2="96" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#FF8A1F" /><stop offset=".5" stopColor="#FF2E7E" /><stop offset="1" stopColor="#7B3FF2" />
              </linearGradient>
              <linearGradient id="ss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".38" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
            </defs>
            <rect width="100" height="100" rx="27" fill="url(#sg)" />
            <path d="M0 27C0 12 12 0 27 0h46c15 0 27 12 27 27v6C70 46 30 46 0 33z" fill="url(#ss)" />
            <g fill="#fff">
              <rect className="sp-bar sp-v" x="27" y="24" width="13" height="53" rx="6.5" />
              <rect className="sp-bar sp-h1" x="27" y="24" width="38" height="13" rx="6.5" />
              <rect className="sp-bar sp-h2" x="27" y="47" width="27" height="12" rx="6" />
            </g>
            <path className="sp-arrow" d="M63 21.5 79 30.5 63 39.5" fill="none" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" pathLength={1} />
            <g className="sp-dot"><circle cx="67" cy="69" r="9.5" fill="#FFC940" /><circle cx="67" cy="69" r="3.6" fill="#FF2E7E" /></g>
          </svg>
          <span className="splash-shine" />
        </div>

        <h1 className="splash-word">
          {letters.map((c, i) => <span key={i} className="mask"><span className="grad-text-w" style={{ animationDelay: `${1.4 + i * 0.08}s, 1.8s` }}>{c}</span></span>)}
          <span className="splash-gap" />
          {letters2.map((c, i) => <span key={i} className="mask"><span style={{ animationDelay: `${1.8 + i * 0.08}s`, color: "#fff" }}>{c}</span></span>)}
        </h1>
        <p className="splash-tag">توصيل · TRANSPORT PARTOUT EN ALGÉRIE</p>

        <div className="splash-road"><span className="splash-truck">🚚</span></div>
      </div>
    </div>
  );
}
