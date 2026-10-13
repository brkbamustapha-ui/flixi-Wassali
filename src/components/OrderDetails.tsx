"use client";
import { useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Order } from "@/lib/supabase";
import { mapsLink } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

/** Galerie de photos chargées à la demande (la première + les photos supplémentaires). */
export function Gallery({ imgs }: { imgs: string[] }) {
  const { t } = useI18n();
  const [big, setBig] = useState<string | null>(null);
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {imgs.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <button key={i} type="button" onClick={() => setBig(src)} aria-label={t("Agrandir la photo")}><img src={src} alt={t("Photo de la marchandise")} className="h-24 w-24 rounded-xl border border-violet-100 object-cover" /></button>
        ))}
      </div>
      {big && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4" onClick={() => setBig(null)} role="presentation">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={big} alt="" className="max-h-full max-w-full rounded-xl" />
        </div>
      )}
    </>
  );
}

/** Boutons Google Maps vers le point de chargement / de livraison (quand le client a donné sa position). */
export function MapsButtons({ fromLat, fromLng, toLat, toLng }: { fromLat?: number | null; fromLng?: number | null; toLat?: number | null; toLng?: number | null }) {
  const { t } = useI18n();
  if (fromLat == null && toLat == null) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {fromLat != null && fromLng != null && <a href={mapsLink(fromLat, fromLng)} target="_blank" rel="noreferrer" className="btn btn-ok !py-1.5 text-sm">🧭 {t("Google Maps — point de chargement")}</a>}
      {toLat != null && toLng != null && <a href={mapsLink(toLat, toLng)} target="_blank" rel="noreferrer" className="btn btn-ghost !py-1.5 text-sm">🏁 {t("Google Maps — point de livraison")}</a>}
    </div>
  );
}

/** Détails d'une marchandise : manutention, dimensions, véhicule voulu, arrivée souhaitée, adresses, photos (chargées à la demande). */
export default function OrderDetails({ order, sb, maps }: { order: Order; sb: SupabaseClient; maps?: boolean }) {
  const { t, date } = useI18n();
  const [imgs, setImgs] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const dims = [order.length_cm, order.width_cm, order.height_cm];
  const hasDims = dims.some((d) => d != null);

  async function showImg() {
    setLoading(true);
    const { data } = await sb.from("flixi_orders").select("goods_img,extra_imgs").eq("id", order.id).maybeSingle();
    const d = data as { goods_img: string | null; extra_imgs: string[] | null } | null;
    setImgs([...(d?.goods_img ? [d.goods_img] : []), ...(d?.extra_imgs ?? [])]);
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
      {maps && <MapsButtons fromLat={order.from_lat} fromLng={order.from_lng} toLat={order.to_lat} toLng={order.to_lng} />}
      {order.has_img && (imgs
        ? <Gallery imgs={imgs} />
        : <button type="button" onClick={showImg} disabled={loading} className="btn btn-ghost !py-1.5 text-sm">📷 {loading ? "…" : t("Voir les photos de la marchandise")}</button>)}
    </div>
  );
}
