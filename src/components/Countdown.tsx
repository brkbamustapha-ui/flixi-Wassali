"use client";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

/** Compte à rebours en direct jusqu'à la fin d'une enchère. */
export function Countdown({ to, className = "" }: { to: string | Date | null | undefined; className?: string }) {
  const { t } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  if (!to) return null;
  const ms = new Date(to).getTime() - now;
  if (ms <= 0) return <span className={className}>{t("Enchère terminée")}</span>;
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const txt = d > 0 ? t("{d}j {h}h {m}min", { d, h, m }) : h > 0 ? t("{h}h {m}min", { h, m }) : t("{m}min {s}s", { m, s: sec });
  return <span dir="ltr" className={`tabular-nums ${className}`}>{txt}</span>;
}

/** Bandeau d'état d'une enchère (compte à rebours + tour) */
export function AuctionBanner({ endsAt, round, label }: { endsAt: string | null; round?: number; label?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-gradient-to-r from-amber-50 to-pink-50 px-3 py-2 text-sm font-bold text-amber-900">
      <span>⏱ {label ?? t("Fin des enchères dans")}</span>
      <Countdown to={endsAt} className="text-brand-pink" />
      {round && round > 1 ? <span className="badge bg-white text-slate-600">{t("Tour {n}", { n: round })}</span> : null}
    </div>
  );
}
