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

/** Bandeau d'état d'une enchère : ouverte à tous, seul celui qui l'a lancée peut la terminer. */
export function AuctionBanner({ depart, round, who }: { depart?: Date | null; round?: number; who: "client" | "driver" }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl bg-gradient-to-r from-emerald-50 to-sky-50 px-3 py-2 text-sm font-bold text-emerald-900">
      <span>🔓 {who === "client" ? t("Enchère ouverte à tous les transporteurs — seul le client peut la terminer") : t("Enchère ouverte à tous les clients — seul le transporteur peut la terminer")}</span>
      {depart && <span className="text-xs font-semibold text-slate-600">⏱ {t("Départ dans")} <Countdown to={depart} className="text-brand-pink" /></span>}
      {round && round > 1 ? <span className="badge bg-white text-slate-600">{t("Tour {n}", { n: round })}</span> : null}
    </div>
  );
}
