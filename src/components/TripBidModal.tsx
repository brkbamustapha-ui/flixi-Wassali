"use client";
import { FormEvent, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Alert, Field, PriceBreakdown } from "./ui";
import { AuctionBanner } from "./Countdown";
import CommunePicker from "./CommunePicker";
import PhotoPicker from "./PhotoPicker";
import { departDate, GOODS_TYPES, MIN_PRICE, da } from "@/lib/format";
import { findWilaya, wilayasAlong } from "@/lib/wilayas";
import { getPosition } from "@/lib/location";
import { useI18n } from "@/lib/i18n";

export type PublicTrip = {
  id: string; from_wilaya: string; to_wilaya: string; from_commune?: string | null; to_commune?: string | null; allow_enroute?: boolean;
  depart_date: string; depart_time: string; price: number | null; note: string | null;
  driver_first_name: string | null; ref?: string; rating?: number; rating_count?: number; urgent?: boolean; vehicle_type: string; deliveries: number; phase: string; round: number; offers: { price: number; mine: boolean; won: boolean }[];
  is_mine: boolean; best: number | null; bids: number; my_bid: { price: number; status: string } | null;
};

/** Postuler sur l'annonce d'un transporteur : TOUTES les informations de la marchandise sont obligatoires (comme pour une commande). */
export default function TripBidModal({ trip, mode, sb, onClose, onDone }: { trip: PublicTrip; mode: "accept" | "bid"; sb: SupabaseClient; onClose: () => void; onDone: () => void }) {
  const { t, w, date, lang } = useI18n();
  const accept = mode === "accept";
  const enroute = !!trip.allow_enroute;
  const corridor = useMemo(() => (enroute ? wilayasAlong(findWilaya(trip.from_wilaya)!, findWilaya(trip.to_wilaya)!) : []), [enroute, trip.from_wilaya, trip.to_wilaya]);
  const [goods, setGoods] = useState(GOODS_TYPES[0]);
  const [weight, setWeight] = useState("");
  const [desc, setDesc] = useState("");
  const [dims, setDims] = useState({ l: "", w: "", h: "" });
  const [photos, setPhotos] = useState<string[]>([]);
  const [handlers, setHandlers] = useState("0");
  const [floor, setFloor] = useState("");
  const [bring, setBring] = useState(false);
  const [fromW, setFromW] = useState(trip.from_wilaya);
  const [toW, setToW] = useState(trip.to_wilaya);
  const [fromCom, setFromCom] = useState("");
  const [toCom, setToCom] = useState("");
  const [fromAddr, setFromAddr] = useState("");
  const [toAddr, setToAddr] = useState("");
  const [fromPt, setFromPt] = useState<{ lat: number; lng: number } | null>(null);
  const [toPt, setToPt] = useState<{ lat: number; lng: number } | null>(null);
  const [price, setPrice] = useState(String(accept ? trip.price : trip.my_bid?.price ?? Math.max((trip.best ?? 0) + 100, MIN_PRICE)));
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const p = Number(price);
  const ok = Number.isFinite(p) && p >= MIN_PRICE && Number.isInteger(p);
  const fw = findWilaya(fromW)!, tw = findWilaya(toW)!;

  async function myPos(side: "from" | "to") {
    setErr("");
    const { pos, denied } = await getPosition();
    if (!pos) return setErr(denied ? t("Activez la localisation de votre appareil pour ajouter votre position.") : t("Impossible d'obtenir votre position."));
    (side === "from" ? setFromPt : setToPt)({ lat: pos.lat, lng: pos.lng });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ok || busy) return;
    setErr("");
    if (!weight || Number(weight) <= 0) return setErr(t("Indiquez le poids de la marchandise."));
    if (!dims.l || !dims.w || !dims.h) return setErr(t("Indiquez la longueur, la largeur et la hauteur."));
    if (photos.length === 0) return setErr(t("Ajoutez au moins une photo de la marchandise."));
    if (!fromCom || !toCom) return setErr(t("Choisissez la commune de départ et la commune d'arrivée."));
    if (!fromAddr.trim() || !toAddr.trim()) return setErr(t("Indiquez l'adresse de départ et l'adresse d'arrivée."));
    if (enroute && corridor.length && corridor.findIndex((x) => x.name === fromW) > corridor.findIndex((x) => x.name === toW)) return setErr(t("Le départ doit précéder l'arrivée sur le trajet du transporteur."));
    setBusy(true);
    const { error } = await sb.rpc("flixi_trip_bid2", {
      p_trip: trip.id, p_price: p, p_goods: goods, p_desc: desc, p_weight: Number(weight),
      p_info: {
        from_wilaya: fromW, to_wilaya: toW, from_commune: fromCom, to_commune: toCom, from_address: fromAddr, to_address: toAddr,
        from_lat: fromPt?.lat ?? null, from_lng: fromPt?.lng ?? null, to_lat: toPt?.lat ?? null, to_lng: toPt?.lng ?? null,
        length_cm: Number(dims.l), width_cm: Number(dims.w), height_cm: Number(dims.h),
        handlers_count: Number(handlers) || 0, floor_no: floor !== "" ? Number(floor) : null, driver_brings_handlers: Number(handlers) > 0 && bring,
        goods_img: photos[0], extra_imgs: photos.slice(1),
      },
    });
    setBusy(false);
    if (error) return setErr(t(error.message));
    onDone();
  }

  const wSel = (value: string, set: (v: string) => void) => (
    <select className="select" value={value} onChange={(e) => { set(e.target.value); }} disabled={!enroute}>
      {(enroute ? corridor : [findWilaya(value)!]).map((x) => <option key={x.code} value={x.name}>{w(x.name)}</option>)}
    </select>
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-ink/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose} role="presentation">
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="card max-h-[94vh] w-full max-w-2xl space-y-4 overflow-y-auto !rounded-b-none p-5 sm:!rounded-b-[1.25rem] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold">{accept ? t("Accepter l'offre du transporteur") : t("Enchérir sur ce trajet")}</h2>
            <p className="mt-1 text-sm font-bold text-slate-600">🚚 {trip.ref ?? t("Transporteur")} · {w(trip.from_wilaya)} → {w(trip.to_wilaya)}</p>
            <p className="text-xs text-slate-500">🗓 {t("{d} à {h}", { d: date(trip.depart_date), h: trip.depart_time.slice(0, 5) })} · {t(trip.vehicle_type)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t("Fermer")} className="rounded-full bg-violet-50 px-3 py-1 text-lg font-bold">✕</button>
        </div>
        <AuctionBanner depart={departDate(trip.depart_date, trip.depart_time)} round={trip.round} who="driver" />
        {enroute && <Alert kind="info">🛣 {t("Ce transporteur peut charger en route : choisissez votre point de départ et d'arrivée parmi les wilayas de son trajet.")}</Alert>}
        <Alert kind="info">📝 {t("Renseignez TOUTES les informations de la marchandise (comme pour une commande) : le transporteur les voit avant d'accepter. Votre nom et votre téléphone restent masqués jusqu'à l'acceptation.")}</Alert>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("Type de marchandise")}><select className="select" value={goods} onChange={(e) => setGoods(e.target.value)}>{GOODS_TYPES.map((g) => <option key={g} value={g}>{t(g)}</option>)}</select></Field>
          <Field label={t("Poids approximatif (kg)")}><input className="input" type="number" min={1} required value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={t("ex : 250")} dir="ltr" /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t("Longueur (cm)")}><input className="input" type="number" min={1} required value={dims.l} onChange={(e) => setDims({ ...dims, l: e.target.value })} dir="ltr" /></Field>
          <Field label={t("Largeur (cm)")}><input className="input" type="number" min={1} required value={dims.w} onChange={(e) => setDims({ ...dims, w: e.target.value })} dir="ltr" /></Field>
          <Field label={t("Hauteur (cm)")}><input className="input" type="number" min={1} required value={dims.h} onChange={(e) => setDims({ ...dims, h: e.target.value })} dir="ltr" /></Field>
        </div>
        <Field label={t("Description")}><textarea className="textarea" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t("Nombre de colis, fragile…")} /></Field>
        <PhotoPicker photos={photos} onChange={setPhotos} onError={setErr} required />

        <div className="space-y-3 rounded-2xl bg-violet-50 p-4">
          <p className="text-sm font-extrabold">🏋 {t("Manutention (chargement / déchargement)")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("Nombre de manutentionnaires nécessaires")}><input className="input" type="number" min={0} max={20} value={handlers} onChange={(e) => setHandlers(e.target.value)} dir="ltr" /></Field>
            <Field label={t("Étage où se trouve la marchandise")} hint={t("0 = rez-de-chaussée. Laissez vide si sans objet.")}><input className="input" type="number" min={-3} max={60} value={floor} onChange={(e) => setFloor(e.target.value)} dir="ltr" /></Field>
          </div>
          {Number(handlers) > 0 && <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="h-4 w-4 accent-pink-600" checked={bring} onChange={(e) => setBring(e.target.checked)} />{t("Le chauffeur amène les manutentionnaires avec lui")}</label>}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3 rounded-2xl bg-orange-50/60 p-4">
            <Field label={"📍 " + t("Wilaya de départ")}>{wSel(fromW, (v) => { setFromW(v); setFromCom(""); })}</Field>
            <CommunePicker code={fw.code} value={fromCom} onChange={setFromCom} label={t("Commune de départ")} />
            <Field label={t("Adresse de départ")}><input className="input" required value={fromAddr} onChange={(e) => setFromAddr(e.target.value)} placeholder={t("Rue, repère…")} /></Field>
            <button type="button" onClick={() => myPos("from")} className="btn btn-ghost w-full !py-1.5 text-sm">🎯 {fromPt ? t("Position ajoutée ✔") : t("Ajouter ma position (départ)")}</button>
          </div>
          <div className="space-y-3 rounded-2xl bg-violet-50 p-4">
            <Field label={"🏁 " + t("Wilaya d'arrivée")}>{wSel(toW, (v) => { setToW(v); setToCom(""); })}</Field>
            <CommunePicker code={tw.code} value={toCom} onChange={setToCom} label={t("Commune d'arrivée")} />
            <Field label={t("Adresse d'arrivée")}><input className="input" required value={toAddr} onChange={(e) => setToAddr(e.target.value)} placeholder={t("Rue, repère…")} /></Field>
            <button type="button" onClick={() => myPos("to")} className="btn btn-ghost w-full !py-1.5 text-sm">🎯 {toPt ? t("Position ajoutée ✔") : t("Ajouter ma position (arrivée)")}</button>
          </div>
        </div>
        <p className="text-xs text-slate-500">{t("La position est facultative : il faut activer la localisation de votre appareil pour l'ajouter. Le transporteur pourra alors ouvrir Google Maps directement.")}</p>

        {!accept && (
          <p className="rounded-xl bg-violet-50 p-3 text-xs font-semibold text-violet-800">
            🏆 {t("Meilleure offre actuelle : {p}.", { p: trip.best ? da(trip.best) : "—" })} {t("Le transporteur choisit librement le client qu'il accepte.")}
          </p>
        )}
        {accept ? (
          <p className="text-lg font-extrabold">{t("Prix annoncé : {p}", { p: da(trip.price ?? 0) })}</p>
        ) : (
          <Field label={t("Votre prix (DA)")}>
            <input className="input !text-lg !font-extrabold" type="number" min={MIN_PRICE} step={1} required value={price} onChange={(e) => setPrice(e.target.value)} dir="ltr" />
          </Field>
        )}
        {!ok && <Alert>{t("Indiquez un prix valide (nombre entier en DA).")}</Alert>}
        {ok && <PriceBreakdown price={p} role="client" />}
        {err && <Alert>{err}</Alert>}
        <button disabled={!ok || busy} className="btn btn-primary w-full !py-3.5 text-base">
          {busy ? t("Envoi…") : accept ? t("Accepter et réserver") : trip.my_bid ? t("Modifier mon enchère") : t("Placer mon enchère")}
        </button>
        <span className="sr-only">{lang}</span>
      </form>
    </div>
  );
}
