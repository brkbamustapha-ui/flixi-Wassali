"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/Session";
import { Alert, Empty, Field, Spinner } from "@/components/ui";
import { AuctionBanner } from "@/components/Countdown";
import { MIN_PRICE, auctionPreview, da, departDate, commissionFor } from "@/lib/format";
import { WILAYAS, findWilaya } from "@/lib/wilayas";
import CommunePicker from "@/components/CommunePicker";
import { Gallery, MapsButtons } from "@/components/OrderDetails";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Stars } from "@/components/RatePanel";
import { pingNow, getPosition } from "@/lib/location";
import { useI18n } from "@/lib/i18n";

type TBid = {
  id: string; price: number; status: string; goods_type: string; description: string | null; weight_kg: number | null; alias: string; rating: number; rating_count: number;
  from_wilaya?: string; to_wilaya?: string; from_commune?: string | null; to_commune?: string | null; from_address?: string | null; to_address?: string | null;
  from_lat?: number | null; from_lng?: number | null; to_lat?: number | null; to_lng?: number | null;
  length_cm?: number | null; width_cm?: number | null; height_cm?: number | null; handlers_count?: number; floor_no?: number | null; driver_brings_handlers?: boolean; has_img?: boolean;
};
type Trip = {
  id: string; from_wilaya: string; to_wilaya: string; from_commune?: string | null; to_commune?: string | null; allow_enroute?: boolean; depart_date: string; depart_time: string; price: number | null; note: string | null;
  ref?: string; orders?: { id: string; ref: string; price: number; status: string }[]; parent_order_id?: string | null; status: string; phase: string; urgent?: boolean; round: number; winning_bid_id: string | null; booked_order_id: string | null; bids: TBid[];
};

function BidInfo({ b, sb }: { b: TBid; sb: SupabaseClient }) {
  const { t, w } = useI18n();
  const [open, setOpen] = useState(false);
  const [imgs, setImgs] = useState<string[] | null>(null);
  async function toggle() {
    setOpen(!open);
    if (!imgs && b.has_img) {
      const { data } = await sb.rpc("flixi_trip_bid_photos", { p_bid: b.id });
      const d = data as { goods_img?: string | null; extra_imgs?: string[] } | null;
      setImgs([...(d?.goods_img ? [d.goods_img] : []), ...(d?.extra_imgs ?? [])]);
    }
  }
  const dims = b.length_cm ? `${b.length_cm}×${b.width_cm}×${b.height_cm} cm` : null;
  return (
    <div className="basis-full text-xs">
      <button type="button" onClick={toggle} className="font-bold text-brand-pink">{open ? "▲" : "▼"} {t("Voir tous les détails de la commande")}</button>
      {open && (
        <div className="mt-2 space-y-1 rounded-xl bg-violet-50 p-3 text-slate-700">
          <p>📍 {b.from_wilaya ? w(b.from_wilaya) : ""}{b.from_commune ? ` · ${b.from_commune}` : ""}{b.from_address ? ` · ${b.from_address}` : ""}</p>
          <p>🏁 {b.to_wilaya ? w(b.to_wilaya) : ""}{b.to_commune ? ` · ${b.to_commune}` : ""}{b.to_address ? ` · ${b.to_address}` : ""}</p>
          <p>📦 {t(b.goods_type)}{b.weight_kg ? ` · ${b.weight_kg} kg` : ""}{dims ? ` · ${dims}` : ""}</p>
          {b.description && <p>📝 {b.description}</p>}
          <p>💪 {t("Manutentionnaires")} : {b.handlers_count ?? 0}{b.floor_no != null ? ` · ${t("Étage")} ${b.floor_no}` : ""}{b.driver_brings_handlers ? ` · ${t("le transporteur amène les manutentionnaires")}` : ""}</p>
          <MapsButtons fromLat={b.from_lat} fromLng={b.from_lng} toLat={b.to_lat} toLng={b.to_lng} />
          {imgs && imgs.length > 0 && <Gallery imgs={imgs} />}
        </div>
      )}
    </div>
  );
}

export default function Trips() {
  const { sb, profile, driver } = useSession();
  const { t, w, date } = useI18n();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [fromW, setFromW] = useState("Alger");
  const [toW, setToW] = useState("Oran");
  const [fromCom, setFromCom] = useState("");
  const [toCom, setToCom] = useState("");
  const [fromPt, setFromPt] = useState<{ lat: number; lng: number } | null>(null);
  const [enroute, setEnroute] = useState(false);
  const [dDate, setDDate] = useState("");
  const [dTime, setDTime] = useState("08:00");
  const today = new Date().toISOString().slice(0, 10);
  const preview = auctionPreview(dDate, dTime);

  const load = useCallback(async () => {
    const { data } = await sb.rpc("flixi_my_trips_overview");
    setTrips((data as Trip[]) ?? []);
  }, [sb]);
  useEffect(() => { load(); const i = setInterval(load, 10000); return () => clearInterval(i); }, [load]);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    const form = e.currentTarget;
    const f = new FormData(form);
    const price = f.get("price") ? Number(f.get("price")) : null;
    if (fromW === toW && fromCom === toCom) return setErr(t("Choisissez deux wilayas différentes."));
    if (!fromCom || !toCom) return setErr(t("Choisissez la commune de départ et la commune d'arrivée."));
    if (price !== null && (!Number.isInteger(price) || price < MIN_PRICE)) return setErr(t("Indiquez un prix valide (nombre entier en DA)."));
    if (!preview) return setErr(t("Choisissez la date et l'heure de départ."));
    if (!preview.ok) return setErr(t("Le départ doit être dans au moins 10 minutes."));
    setBusy(true);
    const { error } = await sb.from("flixi_trips").insert({
      driver_id: profile.id, from_wilaya: fromW, to_wilaya: toW, from_commune: fromCom, to_commune: toCom,
      from_address: String(f.get("from_address") || "") || null, to_address: String(f.get("to_address") || "") || null,
      from_lat: fromPt?.lat ?? null, from_lng: fromPt?.lng ?? null, allow_enroute: enroute,
      depart_date: dDate, depart_time: dTime, price, note: String(f.get("note") || "") || null,
    });
    setBusy(false);
    if (error) return setErr(t(error.message));
    form.reset(); setDDate(""); setDTime("08:00"); setFromCom(""); setToCom(""); setFromPt(null); setEnroute(false);
    load();
  }

  async function chooseBid(id: string) {
    setErr("");
    if (!(await pingNow(sb))) return setErr(t("Position introuvable : activez la localisation de votre appareil puis réessayez."));
    const { error } = await sb.rpc("flixi_trip_choose_bid", { p_bid: id });
    if (error) setErr(t(error.message));
    load();
    window.dispatchEvent(new Event("flixi:poll"));
  }

  async function act(fn: string, trip: Trip) {
    setErr("");
    if (fn !== "flixi_trip_decline_winner" && !(await pingNow(sb))) return setErr(t("Position introuvable : activez la localisation de votre appareil puis réessayez."));
    const { error } = await sb.rpc(fn, { p_trip: trip.id });
    if (error) setErr(t(error.message));
    load();
    window.dispatchEvent(new Event("flixi:poll"));
  }

  if (!trips) return <Spinner />;
  const approved = driver?.approval === "approved";
  const fw = findWilaya(fromW)!, tw = findWilaya(toW)!;
  const live = trips.filter((x) => x.status === "open");
  const past = trips.filter((x) => x.status !== "open");

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <form onSubmit={add} className="card space-y-4 p-5 lg:col-span-2 lg:self-start">
        <h1 className="text-xl font-extrabold">{t("Annoncer un trajet")}</h1>
        <p className="text-sm text-slate-500">{t("Les clients voient votre trajet et enchérissent : le prix le plus élevé gagne quand vous terminez l'enchère, puis vous acceptez ou refusez.")}</p>
        {!approved && <Alert kind="info">{t("Disponible après l'approbation de votre dossier.")}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="space-y-3 rounded-2xl bg-orange-50/60 p-4">
            <Field label={"📍 " + t("Wilaya de départ")}><select className="select" value={fromW} onChange={(e) => { setFromW(e.target.value); setFromCom(""); }}>{WILAYAS.map((x) => <option key={x.code} value={x.name}>{w(x.name)}</option>)}</select></Field>
            <CommunePicker code={fw.code} value={fromCom} onChange={setFromCom} label={t("Commune de départ")} />
            <Field label={t("Adresse de départ")}><input name="from_address" className="input" placeholder={t("Rue, repère…")} /></Field>
            <button type="button" onClick={async () => { const { pos, denied } = await getPosition(); if (!pos) return setErr(denied ? t("Activez la localisation de votre appareil pour ajouter votre position.") : t("Impossible d'obtenir votre position.")); setFromPt({ lat: pos.lat, lng: pos.lng }); }} className="btn btn-ghost w-full !py-1.5 text-sm">🎯 {fromPt ? t("Position ajoutée ✔") : t("Ajouter ma position (départ)")}</button>
          </div>
          <div className="space-y-3 rounded-2xl bg-violet-50 p-4">
            <Field label={"🏁 " + t("Wilaya de destination")}><select className="select" value={toW} onChange={(e) => { setToW(e.target.value); setToCom(""); }}>{WILAYAS.map((x) => <option key={x.code} value={x.name}>{w(x.name)}</option>)}</select></Field>
            <CommunePicker code={tw.code} value={toCom} onChange={setToCom} label={t("Commune d'arrivée")} />
            <Field label={t("Adresse d'arrivée")}><input name="to_address" className="input" placeholder={t("Rue, repère…")} /></Field>
          </div>
        </div>
        <label className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-bold"><input type="checkbox" className="mt-1 h-4 w-4 accent-pink-600" checked={enroute} onChange={(e) => setEnroute(e.target.checked)} /><span>🛣 {t("Je peux charger en route (place restante dans le véhicule)")}<span className="block text-xs font-semibold text-slate-600">{t("Les clients choisiront leur départ et leur arrivée parmi les wilayas situées entre vos deux points, dans la même annonce.")}</span></span></label>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Jour de départ")}><input type="date" min={today} required value={dDate} onChange={(e) => setDDate(e.target.value)} className="input" dir="ltr" /></Field>
          <Field label={t("Heure de départ")}><input type="time" required value={dTime} onChange={(e) => setDTime(e.target.value)} className="input" dir="ltr" /></Field>
        </div>
        {preview && !preview.ok && <Alert>{t("Le départ doit être dans au moins 10 minutes.")}</Alert>}
        {preview?.ok && preview.urgent && <Alert kind="info">⚡ {t("Trajet EXPRESS (départ dans moins de 2 heures) : il sera mis en avant auprès des clients, qui peuvent profiter d'un prix bas.")}</Alert>}
        {preview?.ok && !preview.urgent && <Alert kind="info">🔓 {t("L'enchère reste ouverte à tous les clients jusqu'à ce que vous la terminiez.")}</Alert>}
        <Field label={t("Prix à partir de (DA, optionnel)")} hint={t("Prix libre. Les clients peuvent accepter ce prix tout de suite ou enchérir.")}><input name="price" type="number" min={MIN_PRICE} step={1} className="input" dir="ltr" /></Field>
        <Field label={t("Note (capacité, type de marchandise…)")}><input name="note" className="input" /></Field>
        {err && <Alert>{err}</Alert>}
        <button disabled={busy || !approved} className="btn btn-primary w-full">{t("Publier le trajet")}</button>
      </form>

      <div className="space-y-4 lg:col-span-3">
        <h2 className="text-xl font-extrabold">{t("Mes trajets")}</h2>
        {err && <Alert>{err}</Alert>}
        {live.length === 0 && past.length === 0 ? <Empty icon="🗓" title={t("Aucun trajet annoncé")} /> : null}
        {live.map((x) => {
          const winner = x.bids.find((b) => b.id === x.winning_bid_id && b.status === "won");
          return (
            <div key={x.id} className="card space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-extrabold text-brand-pink">{x.ref}</p><p className="text-lg font-extrabold">{w(x.from_wilaya)} <span className="grad-text inline-block rtl:rotate-180">→</span> {w(x.to_wilaya)} {x.urgent && <span className="badge bg-rose-100 text-rose-700">⚡ {t("EXPRESS")}</span>}</p>
                  <p className="text-sm text-slate-600">🗓 {t("{d} à {h}", { d: date(x.depart_date), h: x.depart_time.slice(0, 5) })}{x.price ? ` · ${t("Prix annoncé : {p}", { p: da(x.price) })}` : ""}</p>
                </div>
                <button className="btn btn-danger !px-3 !py-1 text-xs" onClick={async () => { if (!confirm(t("Arrêter cette annonce ? Plus aucun client ne pourra enchérir. Les commandes déjà acceptées restent valables."))) return; await sb.from("flixi_trips").update({ status: "closed" }).eq("id", x.id); load(); }}>⏹ {t("Arrêter l'annonce")}</button>
              </div>

              {(x.orders?.filter((o) => ["matched", "in_transit"].includes(o.status)).length ?? 0) > 0 && (
                <div className="rounded-2xl bg-emerald-50 p-3 text-sm">
                  <p className="font-extrabold text-emerald-800">✔ {t("{n} commande(s) acceptée(s) sur cette annonce", { n: x.orders!.filter((o) => ["matched", "in_transit"].includes(o.status)).length })}</p>
                  <div className="mt-1 flex flex-wrap gap-2">{x.orders!.filter((o) => ["matched", "in_transit"].includes(o.status)).map((o) => <Link key={o.id} href={`/driver/orders/${o.id}`} className="badge bg-white text-emerald-700 ring-1 ring-emerald-200">{o.ref} · {da(o.price)} →</Link>)}</div>
                  <p className="mt-1 text-xs text-emerald-900">{t("L'annonce reste ouverte : vous pouvez accepter d'autres clients tant qu'il vous reste de la place. Arrêtez-la quand vous voulez.")}</p>
                </div>
              )}

              {x.phase === "bidding" && <AuctionBanner depart={departDate(x.depart_date, x.depart_time)} round={x.round} who="driver" />}

              {x.phase === "awaiting_driver" && winner && (
                <div className="rounded-2xl border-2 border-brand-pink bg-pink-50/50 p-4">
                  <p className="text-sm font-extrabold text-brand-pink">🏆 {t("Enchère terminée — offre gagnante")}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div><p className="font-extrabold">👤 {t("Client")}</p><p className="text-xs text-slate-600">{t(winner.goods_type)}{winner.weight_kg ? ` · ${winner.weight_kg} kg` : ""}{winner.description ? ` · ${winner.description}` : ""}</p></div>
                    <div className="text-end"><p className="text-xl font-extrabold">{da(winner.price)}</p><p className="text-xs font-bold text-slate-500">{t("Vous recevrez {a} (net, commission de {c} déduite)", { a: da(winner.price - commissionFor(winner.price)), c: da(commissionFor(winner.price)) })}</p></div>
                  </div>
                  <BidInfo b={winner} sb={sb} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button onClick={() => act("flixi_trip_accept_winner", x)} className="btn btn-primary !py-2 text-sm">✔ {t("Accepter cette offre")}</button>
                    <button onClick={() => act("flixi_trip_decline_winner", x)} className="btn btn-danger !py-2 text-sm">✖ {t("Refuser — relancer l'enchère")}</button>
                  </div>
                </div>
              )}

              {x.bids.length === 0 ? (
                <p className="rounded-xl bg-violet-50 p-3 text-sm text-slate-600">{t("Aucune offre pour l'instant")}</p>
              ) : (
                <div className="space-y-1.5">
                  {x.bids.map((b, i) => (
                    <div key={b.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-2.5 text-sm ${b.status === "won" ? "border-brand-pink" : i === 0 ? "border-emerald-300 bg-emerald-50/50" : "border-violet-100"}`}>
                      <span><b>👤 {t("Client")} {b.alias}</b> {b.rating_count > 0 && <Stars value={b.rating} />} <span className="text-xs text-slate-500">· {t(b.goods_type)}{b.weight_kg ? ` · ${b.weight_kg} kg` : ""}</span></span>
                      <BidInfo b={b} sb={sb} />
                      <span className="flex items-center gap-2">{b.status === "accepted" ? <span className="badge bg-emerald-100 text-emerald-700">✔ {t("Accepté")}</span> : <button onClick={() => chooseBid(b.id)} className="btn btn-primary !px-3 !py-1 text-xs">✔ {t("Choisir")}</button>}<b className="text-base">{da(b.price)}</b>{i === 0 && x.phase === "bidding" && <span className="badge bg-emerald-100 text-emerald-700">{t("Meilleur prix")}</span>}</span>
                    </div>
                  ))}
                </div>
              )}

              {x.phase === "bidding" && x.bids.length > 0 && (
                <button onClick={() => { if (confirm(t("Terminer l'enchère maintenant ? L'offre la plus élevée ({p}) gagnera.", { p: da(x.bids[0].price) }))) act("flixi_trip_end_auction", x); }} className="btn btn-primary w-full text-sm">🔨 {t("Terminer l'enchère")}</button>
              )}
            </div>
          );
        })}

        {past.length > 0 && <h3 className="pt-2 text-sm font-extrabold uppercase tracking-wide text-slate-500">{t("Trajets terminés")}</h3>}
        {past.map((x) => (
          <div key={x.id} className="card flex flex-wrap items-center justify-between gap-2 p-4 text-sm opacity-90">
            <div><p className="font-extrabold">{w(x.from_wilaya)} → {w(x.to_wilaya)}</p><p className="text-xs text-slate-500">🗓 {t("{d} à {h}", { d: date(x.depart_date), h: x.depart_time.slice(0, 5) })}</p></div>
            <div className="flex items-center gap-2">
              {(x.orders?.length ?? 0) > 0 ? x.orders!.map((o) => <Link key={o.id} href={`/driver/orders/${o.id}`} className="badge bg-emerald-100 text-emerald-700">✔ {o.ref} →</Link>) : <span className="badge bg-slate-200 text-slate-600">{t("Fermé")}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
