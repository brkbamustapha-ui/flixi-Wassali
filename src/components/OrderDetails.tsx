"use client";
import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Order } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";

/** Détails d'une marchandise : manutention, dimensions, véhicule voulu, arrivée souhaitée, adresses, photo (chargée à la demande). */
export default function OrderDetails({ order, sb }: { order: Order; sb: SupabaseClient }) {
  const { t, date } = useI18n();
  const [img, setImg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const dims = [order.length_cm, order.width_cm, order.height_cm];
  const hasDims = dims.some((d) => d != null);

  async function showImg() {
    setLoading(true);
    const { data } = await sb.from("flixi_orders").select("goods_img").eq("id", order.id).maybeSingle();
    setImg((data as { goods_img: string | null } | null)?.goods_img ?? null);
    setLoading(false);
  }

  return (
    <div className="mt-3 space-y-2 text-sm">
      <div className="flex flex-wrap gap-2">
        <span className="badge bg-violet-100 text-violet-700">🏋 {order.handlers_count ? t("{n} manutentionnaire(s) nécessaire(s)", { n: order.handlers_count }) : t("Sans manutention")}</span>
        {order.handlers_count ? <span className="badge bg-amber-100 text-amber-800">{order.driver_brings_handlers ? t("Le chauffeur amène les manutentionnaires") : t("Manutentionnaires fournis par le client")}</span> : null}
        {order.floor_no != null && <span className="badge bg-slate-100 text-slate-700">🏢 {order.floor_no === 0 ? t("Rez-de-chaussée") : t("Étage {n}", { n: order.floor_no })}</span>}
        {(order.from_commune || order.to_commune) && <span className="badge bg-sky-50 text-sky-700">📍 {order.from_commune ?? "—"} → {order.to_commune ?? "—"}</span>}
        {order.vehicle_wanted && <span className="badge bg-sky-100 text-sky-700">🚚 {t(order.vehicle_wanted)}</span>}
        {order.want_arrival_date && <span className="badge bg-emerald-100 text-emerald-700">🏁 {t("Arrivée souhaitée : {d}", { d: `${date(order.want_arrival_date)}${order.want_arrival_time ? ` ${order.want_arrival_time.slice(0, 5)}` : ""}` })}</span>}
      </div>
      {hasDims && <p className="text-slate-600">📐 {t("Dimensions (L × l × H) : {d} cm", { d: dims.map((d) => d ?? "?").join(" × ") })}</p>}
      {order.has_img && (img
        // eslint-disable-next-line @next/next/no-img-element
        ? <a href={img} target="_blank" rel="noreferrer"><img src={img} alt={t("Photo de la marchandise")} className="max-h-56 rounded-xl border border-violet-100" /></a>
        : <button type="button" onClick={showImg} disabled={loading} className="btn btn-ghost !py-1.5 text-sm">📷 {loading ? "…" : t("Voir la photo de la marchandise")}</button>)}
    </div>
  );
}
