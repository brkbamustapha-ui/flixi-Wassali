"use client";
import { useEffect, useState } from "react";
import { useSession } from "@/components/Session";
import { Empty, Spinner } from "@/components/ui";
import { Stars } from "@/components/RatePanel";
import { ORDER_STATUS, da } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

type H = {
  id: string; ref: string; role: "client" | "driver"; status: string; goods_type: string; description: string | null; weight_kg: number | null;
  length_cm: number | null; width_cm: number | null; height_cm: number | null; handlers_count: number; floor_no: number | null; driver_brings_handlers: boolean; vehicle_wanted: string | null;
  from_wilaya: string; from_commune: string | null; from_address: string | null; to_wilaya: string; to_commune: string | null; to_address: string | null;
  price: number; commission: number | null; created_at: string; delivered_at: string | null; my_rating: number | null; their_rating: number | null;
};

/** Historique des courses terminées : tout est conservé SAUF l'identité (nom, prénom, téléphone) des deux côtés. */
export default function HistoryList({ role }: { role: "client" | "driver" }) {
  const { sb } = useSession();
  const { t, w, date } = useI18n();
  const [rows, setRows] = useState<H[] | null>(null);
  useEffect(() => { sb.rpc("flixi_my_history").then(({ data }) => setRows(((data as H[]) ?? []).filter((r) => r.role === role))); }, [sb, role]);
  if (!rows) return <Spinner />;
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-extrabold">🕘 {t("Historique")}</h1><p className="text-sm text-slate-500">{t("Vos courses terminées. L'identité (nom, prénom, téléphone) de l'autre partie reste anonyme.")}</p></div>
      {rows.length === 0 ? <Empty icon="🕘" title={t("Aucune course terminée")} /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((r) => {
            const st = ORDER_STATUS[r.status];
            const dims = [r.length_cm, r.width_cm, r.height_cm].some((d) => d != null) ? [r.length_cm, r.width_cm, r.height_cm].map((d) => d ?? "?").join(" × ") : null;
            return (
              <div key={r.id} className="card space-y-2 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="text-xs font-extrabold text-brand-pink">{r.ref}</p><p className="font-extrabold">{t(r.goods_type)}{r.weight_kg ? ` · ${r.weight_kg} kg` : ""}</p></div>
                  <span className={`badge ${st?.tone ?? ""}`}>{t(st?.label ?? r.status)}</span>
                </div>
                <p className="text-lg font-extrabold">{w(r.from_wilaya)}{r.from_commune ? ` (${r.from_commune})` : ""} <span className="grad-text inline-block rtl:rotate-180">→</span> {w(r.to_wilaya)}{r.to_commune ? ` (${r.to_commune})` : ""}</p>
                {(r.from_address || r.to_address) && <p className="text-xs text-slate-500">{r.from_address || "—"} → {r.to_address || "—"}</p>}
                {r.description && <p className="text-sm text-slate-600">{r.description}</p>}
                <div className="flex flex-wrap gap-2 text-xs">
                  {dims && <span className="badge bg-slate-100 text-slate-700">📐 {dims} cm</span>}
                  {r.handlers_count > 0 && <span className="badge bg-violet-100 text-violet-700">🏋 {r.handlers_count}</span>}
                  {r.floor_no != null && <span className="badge bg-slate-100 text-slate-700">🏢 {r.floor_no}</span>}
                  {r.vehicle_wanted && <span className="badge bg-sky-100 text-sky-700">🚚 {t(r.vehicle_wanted)}</span>}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-violet-50 pt-2 text-sm">
                  <b>{da(r.price)}{role === "driver" && r.commission ? <span className="ms-2 text-xs font-semibold text-slate-500">({t("net {n}", { n: da(r.price - r.commission) })})</span> : null}</b>
                  <span className="text-xs text-slate-500">{date(r.delivered_at ?? r.created_at)}</span>
                </div>
                {(r.my_rating || r.their_rating) && <p className="text-xs">{r.my_rating ? <>{t("Ma note :")} <Stars value={r.my_rating} /> </> : null}{r.their_rating ? <>{t("Note reçue :")} <Stars value={r.their_rating} /></> : null}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
