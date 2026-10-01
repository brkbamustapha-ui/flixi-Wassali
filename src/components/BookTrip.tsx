"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Alert, Field, PriceBreakdown } from "./ui";
import { GOODS_TYPES, MIN_PRICE, da } from "@/lib/format";
import { findWilaya } from "@/lib/wilayas";
import { useI18n } from "@/lib/i18n";

export type TripLite = { id: string; from_wilaya: string; to_wilaya: string; depart_date: string; depart_time: string; price: number | null; driver_first_name: string; vehicle_type: string };

/** Réservation d'un trajet de transporteur : le client propose son prix, le transporteur doit confirmer. */
export default function BookTrip({ trip, sb, onClose }: { trip: TripLite; sb: SupabaseClient; onClose: () => void }) {
  const { t, w, date } = useI18n();
  const router = useRouter();
  const [goods, setGoods] = useState(GOODS_TYPES[0]);
  const [weight, setWeight] = useState("");
  const [desc, setDesc] = useState("");
  const [fromAddr, setFromAddr] = useState("");
  const [toAddr, setToAddr] = useState("");
  const [price, setPrice] = useState(String(Math.max(trip.price ?? MIN_PRICE, MIN_PRICE)));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const p = Number(price);
  const ok = Number.isFinite(p) && p >= MIN_PRICE;
  const a = findWilaya(trip.from_wilaya)!, b = findWilaya(trip.to_wilaya)!;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ok || busy) return;
    setBusy(true); setErr("");
    const { data, error } = await sb.rpc("flixi_book_trip", {
      p_trip: trip.id, p_goods: goods, p_desc: desc, p_weight: weight ? Number(weight) : null, p_from_addr: fromAddr, p_to_addr: toAddr,
      p_price: p, p_from_lat: a.lat, p_from_lng: a.lng, p_to_lat: b.lat, p_to_lng: b.lng,
    });
    if (error) { setBusy(false); return setErr(t(error.message)); }
    router.push(`/client/orders/${data}`);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose} role="presentation">
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="card max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto !rounded-b-none p-5 sm:!rounded-b-[1.25rem] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold">{t("Réserver ce trajet")}</h2>
            <p className="mt-1 text-sm font-bold text-slate-600">🚚 {trip.driver_first_name} · {w(trip.from_wilaya)} → {w(trip.to_wilaya)}</p>
            <p className="text-xs text-slate-500">🗓 {t("{d} à {h}", { d: date(trip.depart_date), h: trip.depart_time.slice(0, 5) })} · {t(trip.vehicle_type)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Fermer")} className="rounded-full bg-violet-50 px-3 py-1 text-lg font-bold">✕</button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("Type de marchandise")}><select className="select" value={goods} onChange={(e) => setGoods(e.target.value)}>{GOODS_TYPES.map((g) => <option key={g} value={g}>{t(g)}</option>)}</select></Field>
          <Field label={t("Poids approximatif (kg)")}><input className="input" type="number" min={0} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={t("ex : 250")} dir="ltr" /></Field>
        </div>
        <Field label={t("Description")}><textarea className="textarea" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t("Dimensions, nombre de colis, fragile…")} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("Adresse de départ")}><input className="input" value={fromAddr} onChange={(e) => setFromAddr(e.target.value)} placeholder={t("Commune, rue…")} /></Field>
          <Field label={t("Adresse d'arrivée")}><input className="input" value={toAddr} onChange={(e) => setToAddr(e.target.value)} placeholder={t("Commune, rue…")} /></Field>
        </div>
        <Field label={t("Votre prix (DA) — minimum {p}", { p: da(MIN_PRICE) })} hint={trip.price ? t("Le transporteur annonce un prix à partir de {p}.", { p: da(trip.price) }) : undefined}>
          <input className="input !text-lg !font-extrabold" type="number" min={MIN_PRICE} step={100} required value={price} onChange={(e) => setPrice(e.target.value)} dir="ltr" />
        </Field>
        {!ok && <Alert>{t("Le prix ne peut pas être inférieur à {p} (prix minimum du marché algérien).", { p: da(MIN_PRICE) })}</Alert>}
        {ok && <PriceBreakdown price={p} role="client" />}
        <p className="rounded-xl bg-violet-50 p-3 text-xs font-semibold text-violet-800">ℹ️ {t("Le transporteur devra confirmer votre réservation. Les numéros de téléphone s'affichent dès qu'il a accepté.")}</p>
        {err && <Alert>{err}</Alert>}
        <button disabled={!ok || busy} className="btn btn-primary w-full !py-3.5 text-base">{busy ? t("Envoi…") : t("Envoyer la réservation")}</button>
      </form>
    </div>
  );
}
