"use client";
import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";

const EASE = [0.16, 1, 0.3, 1] as const;
/** Chaque élément grandit depuis son propre centre. */
const FROM_CENTER = { transformBox: "fill-box", transformOrigin: "center" } as const;
const FLIXI = [["F", "#FF8A1F"], ["l", "#FF6A3A"], ["i", "#FF4A5C"], ["x", "#FF2E7E"], ["i", "#D63AA6"]] as const;
const WASSALI = "Wassali".split("");

/**
 * Logo animé : le badge apparaît, l'anneau se trace, le « F » se construit barre par barre, la flèche se dessine,
 * le point jaune rebondit, les lettres s'inscrivent, les étoiles tournent, puis un reflet passe.
 */
export function LogoIntro({ delay = 0, onDone }: { delay?: number; onDone?: () => void }) {
  const reduce = useReducedMotion();
  const id = useId().replace(/:/g, "");
  const at = (s: number) => delay + s;
  const hidden = <T,>(v: T) => (reduce ? false : v);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[min(46vw,190px)]">
        <svg viewBox="0 0 100 100" className="block w-full overflow-visible" role="img" aria-label="Flixi Wassali">
          <defs>
            <linearGradient id={`g-${id}`} x1="8" y1="6" x2="94" y2="96" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#FF8A1F" /><stop offset=".5" stopColor="#FF2E7E" /><stop offset="1" stopColor="#7B3FF2" />
            </linearGradient>
            <linearGradient id={`s-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".38" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
            <linearGradient id={`shine-${id}`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset="0.5" stopColor="#fff" stopOpacity="0.55" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <clipPath id={`clip-${id}`}><rect width="100" height="100" rx="27" /></clipPath>
          </defs>

          {/* lueur */}
          <motion.circle cx="50" cy="50" r="62" fill="rgb(255 46 126 / 0.22)" style={{ ...FROM_CENTER, filter: "blur(14px)" }}
            initial={hidden({ scale: 0.4, opacity: 0 })} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.6, delay: at(0), ease: EASE }} />

          {/* badge */}
          <motion.rect width="100" height="100" rx="27" fill={`url(#g-${id})`} style={FROM_CENTER}
            initial={hidden({ scale: 0.86, opacity: 0 })} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 1.1, delay: at(0), ease: EASE }} />
          <motion.path d="M0 27C0 12 12 0 27 0h46c15 0 27 12 27 27v6C70 46 30 46 0 33z" fill={`url(#s-${id})`}
            initial={hidden({ opacity: 0 })} animate={{ opacity: 1 }} transition={{ duration: 1, delay: at(0.3) }} />

          {/* anneau tracé autour du badge */}
          <motion.rect x="-6" y="-6" width="112" height="112" rx="33" fill="none" stroke="rgb(255 255 255 / 0.55)" strokeWidth="1.4"
            initial={hidden({ pathLength: 0 })} animate={{ pathLength: 1 }} transition={{ duration: 1.3, delay: at(0.25), ease: [0.65, 0, 0.35, 1] }} />

          {/* le F se construit */}
          <g fill="#fff">
            <motion.rect x="27" y="24" width="13" height="53" rx="6.5" style={{ transformBox: "fill-box", transformOrigin: "50% 0" }}
              initial={hidden({ scaleY: 0, opacity: 0 })} animate={{ scaleY: 1, opacity: 1 }} transition={{ duration: 0.7, delay: at(0.55), ease: EASE }} />
            <motion.rect x="27" y="24" width="38" height="13" rx="6.5" style={{ transformBox: "fill-box", transformOrigin: "0 50%" }}
              initial={hidden({ scaleX: 0, opacity: 0 })} animate={{ scaleX: 1, opacity: 1 }} transition={{ duration: 0.65, delay: at(0.8), ease: EASE }} />
            <motion.rect x="27" y="47" width="27" height="12" rx="6" style={{ transformBox: "fill-box", transformOrigin: "0 50%" }}
              initial={hidden({ scaleX: 0, opacity: 0 })} animate={{ scaleX: 1, opacity: 1 }} transition={{ duration: 0.6, delay: at(0.95), ease: EASE }} />
          </g>
          <motion.path d="M63 21.5 79 30.5 63 39.5" fill="none" stroke="#fff" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round"
            initial={hidden({ pathLength: 0, opacity: 0 })} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.55, delay: at(1.1), ease: [0.65, 0, 0.35, 1] }} />
          <g style={FROM_CENTER}>
            <motion.g style={FROM_CENTER} initial={hidden({ scale: 0, opacity: 0 })} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 190, damping: 12, delay: at(1.3) }}>
              <circle cx="67" cy="69" r="9.5" fill="#FFC940" /><circle cx="67" cy="69" r="3.6" fill="#FF2E7E" />
            </motion.g>
          </g>

          {/* reflet */}
          {!reduce && (
            <g clipPath={`url(#clip-${id})`}>
              <g transform="rotate(20 50 50)">
                <motion.rect x={0} y={-60} width={40} height={220} fill={`url(#shine-${id})`} initial={{ x: -90 }} animate={{ x: 190 }}
                  transition={{ duration: 1.1, delay: at(2.0), ease: [0.45, 0, 0.2, 1] }} onAnimationComplete={onDone} />
              </g>
            </g>
          )}
        </svg>

        {/* étoiles */}
        {[{ l: "-14%", t: "-8%", s: 22 }, { l: "104%", t: "68%", s: 16 }].map((p, i) => (
          <motion.svg key={i} viewBox="0 0 24 24" width={p.s} height={p.s} className="absolute" style={{ left: p.l, top: p.t }}
            initial={hidden({ scale: 0, rotate: -120, opacity: 0 })} animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 190, damping: 12, delay: at(1.7 + i * 0.12) }}>
            <path d="M12 0c.9 6.6 5.4 11.1 12 12-6.6.9-11.1 5.4-12 12-.9-6.6-5.4-11.1-12-12 6.6-.9 11.1-5.4 12-12z" fill="#FFC940" />
          </motion.svg>
        ))}
      </div>

      {/* nom : les lettres s'inscrivent */}
      <h1 dir="ltr" className="mt-8 flex items-baseline text-[clamp(2.4rem,8vw,3.6rem)] font-extrabold leading-none tracking-[-0.03em]" aria-label="Flixi Wassali">
        {FLIXI.map(([c, col], i) => (
          <motion.span key={`a${i}`} style={{ color: col, display: "inline-block" }} initial={hidden({ opacity: 0, scale: 0.4, y: 14 })} animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: at(1.25 + i * 0.05), ease: EASE }}>{c}</motion.span>
        ))}
        <span className="w-[0.28em]" />
        {WASSALI.map((c, i) => (
          <motion.span key={`b${i}`} className="inline-block text-white" initial={hidden({ opacity: 0, scale: 0.4, y: 14 })} animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, delay: at(1.5 + i * 0.05), ease: EASE }}>{c}</motion.span>
        ))}
      </h1>

      {/* signature */}
      <motion.div className="mt-4 flex items-center justify-center gap-4 text-[11px] font-bold uppercase tracking-[0.34em] text-white/75"
        initial={hidden({ opacity: 0, y: 8 })} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: at(1.9), ease: EASE }}>
        <motion.span className="block h-px w-12 origin-right bg-gradient-to-r from-transparent to-[#ff9a5a]" initial={hidden({ scaleX: 0 })} animate={{ scaleX: 1 }} transition={{ duration: 0.9, delay: at(2), ease: EASE }} />
        <span dir="ltr">وصّالي · Algérie</span>
        <motion.span className="block h-px w-12 origin-left bg-gradient-to-l from-transparent to-[#ff9a5a]" initial={hidden({ scaleX: 0 })} animate={{ scaleX: 1 }} transition={{ duration: 0.9, delay: at(2), ease: EASE }} />
      </motion.div>
    </div>
  );
}
