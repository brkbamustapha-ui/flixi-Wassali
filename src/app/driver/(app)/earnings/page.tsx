"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/Session";
import { Empty, Spinner } from "@/components/ui";
import { da } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

type M = { month: string; deliveries: number; gross: number; commission: number; net: number };

/** Gains nets du transporteur : le mois en cours + les mois précédents (le compteur repart à zéro chaque mois). */
export default function Earnings() {
  const { sb } = useSession();
  const { t, lang } = useI18n();
  const [rows, setRows] = useState<M[] | null>(null);
  useEffect(() => { sb.rpc("flixi_my_earnings").then(({ data }) => setRows((data as M[]) ?? [])); }, [sb]);
  if (!rows) return <Spinner />;
  const nowKey = new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Algiers" }).slice(0, 7);
  const cur = rows.find((r) => r.month === nowKey) ?? { month: nowKey, deliveries: 0, gross: 0, commission: 0, net: 0 };
  const past = rows.filter((r) => r.month !== nowKey);
  const label = (k: string) => new Date(`${k}-01T12:00:00`).toLocaleDateString(lang === "fr" ? "fr-DZ" : lang === "en" ? "en-GB" : "ar-DZ-u-nu-latn", { month: "long", year: "numeric" });
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">💰 {t("Mes gains")}</h1>
      <div className="grad-bg rounded-3xl p-6 text-white shadow-lg">
        <p className="text-sm font-bold opacity-90">{t("Gain net — {m}", { m: label(cur.month) })}</p>
        <p className="mt-1 text-4xl font-extrabold">{da(cur.net)}</p>
        <p className="mt-2 text-sm text-white/90">{t("{n} course(s) livrée(s) · total encaissé {g} − commissions {c}", { n: cur.deliveries, g: da(cur.gross), c: da(cur.commission) })}</p>
        <p className="mt-1 text-xs text-white/80">{t("Le compteur repart à zéro chaque mois ; les mois précédents restent dans votre historique.")}</p>
      </div>
      <div className="flex flex-wrap gap-2 text-sm font-bold">
        <Link href="/driver/history" className="btn btn-ghost !py-1.5">🕘 {t("Historique des courses")}</Link>
        <Link href="/driver/commissions" className="btn btn-ghost !py-1.5">💳 {t("Commissions à verser")}</Link>
      </div>
      <h2 className="text-lg font-extrabold">{t("Mois précédents")}</h2>
      {past.length === 0 ? <Empty icon="📅" title={t("Aucun mois précédent")} /> : (
        <div className="card divide-y divide-violet-50 overflow-hidden">
          {past.map((r) => (
            <div key={r.month} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
              <div><p className="font-extrabold">{label(r.month)}</p><p className="text-xs text-slate-500">{t("{n} course(s) livrée(s) · total encaissé {g} − commissions {c}", { n: r.deliveries, g: da(r.gross), c: da(r.commission) })}</p></div>
              <b className="grad-text text-lg">{da(r.net)}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
