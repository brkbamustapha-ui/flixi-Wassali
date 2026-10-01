"use client";
import { FormEvent, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Alert, Field, PriceBreakdown } from "./ui";
import { AuctionBanner } from "./Countdown";
import { GOODS_TYPES, MIN_PRICE, da } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export type PublicTrip = {
  id: string; from_wilaya: string; to_wilaya: string; depart_date: string; depart_time: string; price: number | null; note: string | null;
  driver_first_name: string; vehicle_type: string; deliveries: number; phase: string; auction_ends_at: string | null; round: number;
  is_mine: boolean; best: number | null; bids: number; my_bid: { price: number; status: string } | null;
};

/** Le client accepte l'offre du transporteur (prix annoncé) ou enchérit avec son propre prix. */
export default function TripBidModal({ trip, mode, sb, onClose, onDone }: { trip: PublicTrip; mode: "accept" | "bid"; sb: SupabaseClient; onClose: () => void; onDone: () => void }) {
  const { t, w, date } = useI18n();
  const accept = mode === "accept";
  const [goods, setGoods] = useState(GOODS_TYPES[0]);
  const [weight, setWeight] = useState("");
  const [desc, setDesc] = useState("");
  const [fromAddr, setFromAddr] = useState("");
  const [toAddr, setToAddr] = useState("");
  const [price, setPrice] = useState(String(accept ? trip.price : trip.my_bid?.price ?? Math.max((trip.best ?? 0) + 100, MIN_PRICE)));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const p = Number(price);
  const ok = Number.isFinite(p) && p >= MIN_PRICE;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ok || busy) return;
    setBusy(true); setErr("");
    const { error } = await sb.rpc("flixi_trip_bid", {
      p_trip: trip.id, p_price: p, p_goods: goods, p_desc: desc, p_weight: weight ? Number(weight) : null,
      p_from_addr: fromAddr, p_to_addr: toAddr, p_buy_now: accept,
    });
    setBusy(false);
    if (error) return setErr(t(error.message));
    onDone();
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose} role="presentation">
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="card max-h-[92vh] w-full max-w-lg space-y-4 overflow-y-auto !rounded-b-none p-5 sm:!rounded-b-[1.25rem] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold">{accept ? t("Accepter l'offre du transporteur") : t("Enchérir sur ce trajet")}</h2>
            <p className="mt-1 text-sm font-bold text-slate-600">🚚 {trip.driver_first_name} · {w(trip.from_wilaya)} → {w(trip.to_wilaya)}</p>
            <p className="text-xs text-slate-500">🗓 {t("{d} à {h}", { d: date(trip.depart_date), h: trip.depart_time.slice(0, 5) })} · {t(trip.vehicle_type)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Fermer")} className="rounded-full bg-violet-50 px-3 py-1 text-lg font-bold">✕</button>
        </div>
        <AuctionBanner endsAt={trip.auction_ends_at} round={trip.round} />
        {!accept && (
          <p className="rounded-xl bg-violet-50 p-3 text-xs font-semibold text-violet-800">
            🏆 {t("Le prix le plus élevé gagne l'enchère. Meilleure offre actuelle : {p}.", { p: trip.best ? da(trip.best) : "—" })}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("Type de marchandise")}><select className="select" value={goods} onChange={(e) => setGoods(e.target.value)}>{GOODS_TYPES.map((g) => <option key={g} value={g}>{t(g)}</option>)}</select></Field>
          <Field label={t("Poids approximatif (kg)")}><input className="input" type="number" min={0} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={t("ex : 250")} dir="ltr" /></Field>
        </div>
        <Field label={t("Description")}><textarea className="textarea" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t("Dimensions, nombre de colis, fragile…")} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("Adresse de départ")}><input className="input" value={fromAddr} onChange={(e) => setFromAddr(e.target.value)} placeholder={t("Commune, rue…")} /></Field>
          <Field label={t("Adresse d'arrivée")}><input className="input" value={toAddr} onChange={(e) => setToAddr(e.target.value)} placeholder={t("Commune, rue…")} /></Field>
        </div>
        {accept ? (
          <p className="text-lg font-extrabold">{t("Prix annoncé : {p}", { p: da(trip.price ?? 0) })}</p>
        ) : (
          <Field label={t("Votre prix (DA) — minimum {p}", { p: da(MIN_PRICE) })}>
            <input className="input !text-lg !font-extrabold" type="number" min={MIN_PRICE} step={100} required value={price} onChange={(e) => setPrice(e.target.value)} dir="ltr" />
          </Field>
        )}
        {!ok && <Alert>{t("Le prix ne peut pas être inférieur à {p} (prix minimum du marché algérien).", { p: da(MIN_PRICE) })}</Alert>}
        {ok && <PriceBreakdown price={p} role="client" />}
        <p className="rounded-xl bg-violet-50 p-3 text-xs font-semibold text-violet-800">
          ℹ️ {accept ? t("Le transporteur devra confirmer. S'il refuse, l'enchère recommence.") : t("À la fin de l'enchère, le transporteur doit accepter l'offre gagnante. S'il refuse, l'enchère recommence.")}
        </p>
        {err && <Alert>{err}</Alert>}
        <button disabled={!ok || busy} className="btn btn-primary w-full !py-3.5 text-base">
          {busy ? t("Envoi…") : accept ? t("Accepter et réserver") : trip.my_bid ? t("Modifier mon enchère") : t("Placer mon enchère")}
        </button>
      </form>
    </div>
  );
}
