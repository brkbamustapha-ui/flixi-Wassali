"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/Session";
import { Alert, Empty, Field, Spinner } from "@/components/ui";
import { AuctionBanner } from "@/components/Countdown";
import { MIN_PRICE, auctionPreview, da, departDate } from "@/lib/format";
import { WILAYAS } from "@/lib/wilayas";
import { useI18n } from "@/lib/i18n";

type TBid = { id: string; price: number; status: string; goods_type: string; description: string | null; weight_kg: number | null; client_first_name: string };
type Trip = {
  id: string; from_wilaya: string; to_wilaya: string; depart_date: string; depart_time: string; price: number | null; note: string | null;
  status: string; phase: string; round: number; winning_bid_id: string | null; booked_order_id: string | null; bids: TBid[];
};

export default function Trips() {
  const { sb, profile, driver } = useSession();
  const { t, w, date } = useI18n();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
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
    if (f.get("from") === f.get("to")) return setErr(t("Choisissez deux wilayas différentes."));
    if (price !== null && price < MIN_PRICE) return setErr(t("Le prix minimum est de {p}.", { p: da(MIN_PRICE) }));
    if (!preview) return setErr(t("Choisissez la date et l'heure de départ."));
    if (!preview.ok) return setErr(t("Le départ doit être dans plus de 2 heures."));
    setBusy(true);
    const { error } = await sb.from("flixi_trips").insert({
      driver_id: profile.id, from_wilaya: String(f.get("from")), to_wilaya: String(f.get("to")),
      depart_date: dDate, depart_time: dTime, price, note: String(f.get("note") || "") || null,
    });
    setBusy(false);
    if (error) return setErr(t(error.message));
    form.reset(); setDDate(""); setDTime("08:00");
    load();
  }

  async function act(fn: string, trip: Trip) {
    setErr("");
    const { error } = await sb.rpc(fn, { p_trip: trip.id });
    if (error) setErr(t(error.message));
    load();
    window.dispatchEvent(new Event("flixi:poll"));
  }

  if (!trips) return <Spinner />;
  const approved = driver?.approval === "approved";
  const live = trips.filter((x) => x.status === "open");
  const past = trips.filter((x) => x.status !== "open");

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <form onSubmit={add} className="card space-y-4 p-5 lg:col-span-2 lg:self-start">
        <h1 className="text-xl font-extrabold">{t("Annoncer un trajet")}</h1>
        <p className="text-sm text-slate-500">{t("Les clients voient votre trajet et enchérissent : le prix le plus élevé gagne quand vous terminez l'enchère, puis vous acceptez ou refusez.")}</p>
        {!approved && <Alert kind="info">{t("Disponible après l'approbation de votre dossier.")}</Alert>}
        <Field label={t("Wilaya de départ")}><select name="from" className="select">{WILAYAS.map((x) => <option key={x.code} value={x.name}>{w(x.name)}</option>)}</select></Field>
        <Field label={t("Wilaya de destination")}><select name="to" defaultValue="Oran" className="select">{WILAYAS.map((x) => <option key={x.code} value={x.name}>{w(x.name)}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Jour de départ")}><input type="date" min={today} required value={dDate} onChange={(e) => setDDate(e.target.value)} className="input" dir="ltr" /></Field>
          <Field label={t("Heure de départ")}><input type="time" required value={dTime} onChange={(e) => setDTime(e.target.value)} className="input" dir="ltr" /></Field>
        </div>
        {preview && (preview.ok
          ? <Alert kind="info">🔓 {t("L'enchère reste ouverte à tous les clients jusqu'à ce que vous la terminiez.")}</Alert>
          : <Alert>{t("Le départ doit être dans plus de 2 heures.")}</Alert>)}
        <Field label={t("Prix à partir de (DA, optionnel)")} hint={t("Les clients peuvent accepter ce prix tout de suite ou enchérir à partir de 1 000 DA.")}><input name="price" type="number" min={MIN_PRICE} step={100} className="input" dir="ltr" /></Field>
        <Field label={t("Note (capacité, type de marchandise…)")}><input name="note" className="input" /></Field>
        {err && <Alert>{err}</Alert>}
        <button disabled={busy || !approved} className="btn btn-primary w-full">{t("Publier le trajet")}</button>
      </form>

      <div className="space-y-4 lg:col-span-3">
        <h2 className="text-xl font-extrabold">{t("Mes trajets")}</h2>
        {live.length === 0 && past.length === 0 ? <Empty icon="🗓" title={t("Aucun trajet annoncé")} /> : null}
        {live.map((x) => {
          const winner = x.bids.find((b) => b.id === x.winning_bid_id && b.status === "won");
          return (
            <div key={x.id} className="card space-y-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-extrabold">{w(x.from_wilaya)} <span className="grad-text inline-block rtl:rotate-180">→</span> {w(x.to_wilaya)}</p>
                  <p className="text-sm text-slate-600">🗓 {t("{d} à {h}", { d: date(x.depart_date), h: x.depart_time.slice(0, 5) })}{x.price ? ` · ${t("Prix annoncé : {p}", { p: da(x.price) })}` : ""}</p>
                </div>
                <button className="btn btn-danger !px-3 !py-1 text-xs" onClick={async () => { await sb.from("flixi_trips").update({ status: "closed" }).eq("id", x.id); load(); }}>{t("Fermer")}</button>
              </div>

              {x.phase === "bidding" && <AuctionBanner depart={departDate(x.depart_date, x.depart_time)} round={x.round} who="driver" />}

              {x.phase === "awaiting_driver" && winner && (
                <div className="rounded-2xl border-2 border-brand-pink bg-pink-50/50 p-4">
                  <p className="text-sm font-extrabold text-brand-pink">🏆 {t("Enchère terminée — offre gagnante")}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div><p className="font-extrabold">👤 {winner.client_first_name}</p><p className="text-xs text-slate-600">{t(winner.goods_type)}{winner.weight_kg ? ` · ${winner.weight_kg} kg` : ""}{winner.description ? ` · ${winner.description}` : ""}</p></div>
                    <div className="text-end"><p className="text-xl font-extrabold">{da(winner.price)}</p><p className="text-xs font-bold text-slate-500">{t("À encaisser : {p}", { p: da(winner.price + 500) })}</p></div>
                  </div>
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
                      <span><b>👤 {b.client_first_name}</b> <span className="text-xs text-slate-500">· {t(b.goods_type)}{b.weight_kg ? ` · ${b.weight_kg} kg` : ""}</span></span>
                      <span className="flex items-center gap-2"><b className="text-base">{da(b.price)}</b>{i === 0 && x.phase === "bidding" && <span className="badge bg-emerald-100 text-emerald-700">{t("Meilleur prix")}</span>}</span>
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
              {x.phase === "booked" && x.booked_order_id ? <Link href={`/driver/orders/${x.booked_order_id}`} className="badge bg-emerald-100 text-emerald-700">✔ {t("Réservé")} →</Link> : <span className="badge bg-slate-200 text-slate-600">{t("Fermé")}</span>}
              <button className="btn btn-danger !px-3 !py-1 text-xs" onClick={async () => { await sb.from("flixi_trips").delete().eq("id", x.id); load(); }}>{t("Supprimer")}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
