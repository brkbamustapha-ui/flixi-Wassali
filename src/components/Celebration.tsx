"use client";
import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { da } from "@/lib/format";

export type CelebEvent = { key: string; kind: "ended" | "won" | "deal"; role: "client" | "driver"; id: string; price: number; name: string | null; from: string; to: string };

const COLORS = ["#ff7a1a", "#ff2e7e", "#7b3ff2", "#ffc940", "#22c55e", "#38bdf8", "#ffffff"];

/** Pluie de confettis sur un canvas plein écran (désactivée si l'utilisateur réduit les animations). */
function Confetti({ burst }: { burst: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => { c.width = innerWidth * dpr; c.height = innerHeight * dpr; };
    resize();
    addEventListener("resize", resize);
    const N = burst ? 220 : 120;
    const ps = Array.from({ length: N }, (_, i) => {
      const fromCenter = burst && i < N / 2;
      return {
        x: fromCenter ? innerWidth / 2 : Math.random() * innerWidth, y: fromCenter ? innerHeight * 0.4 : -20 - Math.random() * innerHeight * 0.5,
        vx: fromCenter ? (Math.random() - 0.5) * 16 : (Math.random() - 0.5) * 3, vy: fromCenter ? -6 - Math.random() * 12 : 2 + Math.random() * 4,
        s: 6 + Math.random() * 8, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, col: COLORS[i % COLORS.length], round: Math.random() < 0.3,
      };
    });
    let raf = 0; const t0 = performance.now();
    const tick = (now: number) => {
      const el = (now - t0) / 1000;
      ctx.clearRect(0, 0, c.width, c.height);
      for (const p of ps) {
        p.vy += 0.18; p.vx *= 0.995; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x * dpr, p.y * dpr); ctx.rotate(p.r); ctx.fillStyle = p.col; ctx.globalAlpha = Math.max(0, 1 - Math.max(0, el - 4) / 2);
        if (p.round) { ctx.beginPath(); ctx.arc(0, 0, p.s * 0.45 * dpr, 0, 6.3); ctx.fill(); } else ctx.fillRect(-p.s / 2 * dpr, -p.s * 0.3 * dpr, p.s * dpr, p.s * 0.6 * dpr);
        ctx.restore();
      }
      if (el < 6) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", resize); };
  }, [burst]);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 h-full w-full" />;
}

function CountUp({ to }: { to: number }) {
  const [v, setV] = useState(0);
  useEffect(() => { const a = animate(0, to, { duration: 1.4, ease: [0.16, 1, 0.3, 1], onUpdate: (x) => setV(Math.round(x)) }); return () => a.stop(); }, [to]);
  return <span dir="ltr" className="tabular-nums">{da(v)}</span>;
}

/** Fenêtre de félicitations : marteau (fin d'enchère), trophée (enchère gagnée), poignée de main (affaire conclue). */
export default function Celebration({ ev, onClose, onGo }: { ev: CelebEvent; onClose: () => void; onGo: () => void }) {
  const { t, w } = useI18n();
  const reduce = useReducedMotion();
  const route = `${w(ev.from)} → ${w(ev.to)}`;
  const name = ev.name ?? "";
  const cfg = {
    ended: { icon: "🔨", title: t("Enchère terminée !"), text: ev.role === "client" ? t("Offre gagnante : {n} avec {p}. À vous de la confirmer ou de la refuser.", { n: name, p: da(ev.price) }) : t("Le gagnant est {n} avec {p}. À vous de l'accepter ou de la refuser.", { n: name, p: da(ev.price) }), cta: t("Voir l'offre gagnante") },
    won: { icon: "🏆", title: t("Félicitations ! Vous avez gagné l'enchère"), text: t("Votre offre de {p} est la gagnante. En attente de la confirmation de {n}.", { p: da(ev.price), n: name }), cta: t("Voir") },
    deal: { icon: "🤝", title: t("Félicitations ! Affaire conclue"), text: t("Vous êtes d'accord avec {n}. Les numéros de téléphone sont maintenant visibles.", { n: name }), cta: t("Voir la commande") },
  }[ev.kind];

  useEffect(() => { const i = setTimeout(onClose, 20000); return () => clearTimeout(i); }, [onClose]);

  return (
    <motion.div className="fixed inset-0 z-[9998] flex items-center justify-center bg-[#120b25]/80 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-live="polite">
      {!reduce && <Confetti burst={ev.kind !== "ended"} />}
      <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.6, y: 40, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 190, damping: 18 }}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-white p-7 text-center shadow-2xl">
        <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-gradient-to-r from-orange-300 via-pink-300 to-violet-300 opacity-60 blur-3xl" />
        <div className="relative mx-auto flex h-28 w-28 items-center justify-center">
          {!reduce && [0, 1].map((i) => (
            <motion.span key={i} className="absolute inset-0 rounded-full border-4 border-brand-pink/50" initial={{ scale: 0.5, opacity: 0.8 }} animate={{ scale: 1.9, opacity: 0 }} transition={{ duration: 1.6, delay: 0.5 + i * 0.5, repeat: Infinity }} />
          ))}
          {ev.kind === "ended" ? (
            <motion.span className="text-7xl" style={{ originX: 0.9, originY: 0.9 }} initial={{ rotate: -70, y: -30, opacity: 0 }} animate={{ rotate: [-70, 18, -8, 0], y: [-30, 0, 0, 0], opacity: 1 }} transition={{ duration: 1.1, times: [0, 0.45, 0.7, 1], delay: 0.2 }}>{cfg.icon}</motion.span>
          ) : (
            <motion.span className="text-7xl" initial={{ scale: 0, rotate: -25 }} animate={{ scale: [0, 1.25, 1], rotate: [-25, 12, 0] }} transition={{ duration: 0.9, delay: 0.2, times: [0, 0.6, 1] }}>{cfg.icon}</motion.span>
          )}
        </div>
        <motion.h2 className="relative mt-3 text-2xl font-extrabold leading-tight" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}><span className="grad-text">{cfg.title}</span></motion.h2>
        <motion.p className="relative mt-1 text-sm font-bold text-slate-500" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}>{route}</motion.p>
        <motion.p className="relative my-3 text-4xl font-extrabold" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8 }}><CountUp to={ev.price} /></motion.p>
        <motion.p className="relative text-sm text-slate-600" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>{cfg.text}</motion.p>
        <div className="relative mt-5 flex gap-2">
          <button onClick={onGo} className="btn btn-primary flex-1">{cfg.cta}</button>
          <button onClick={onClose} className="btn btn-ghost">{t("Fermer")}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}
