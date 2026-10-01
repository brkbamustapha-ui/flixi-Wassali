"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/Session";
import { Empty, Spinner, Alert } from "@/components/ui";
import { AuctionBanner } from "@/components/Countdown";
import TripBidModal, { PublicTrip } from "@/components/TripBidModal";
import { da, departDate } from "@/lib/format";
import { WILAYAS } from "@/lib/wilayas";
import { useI18n } from "@/lib/i18n";

type MyBid = {
  id: string; price: number; status: string; goods_type: string; trip_id: string; from_wilaya: string; to_wilaya: string; depart_date: string; depart_time: string;
  phase: string; trip_status: string; auction_ends_at: string | null; order_id: string | null; driver_first_name: string; best: number | null;
};

function OfferList({ offers, empty, title }: { offers: { price: number; name: string; mine: boolean; won: boolean }[]; empty: string; title: string }) {
  if (!offers?.length) return <p className="text-xs font-semibold text-slate-500">{empty}</p>;
  return (
    <div>
      <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-slate-500">{title}</p>
      <ul className="max-h-40 space-y-1 overflow-y-auto pe-1">
        {offers.map((o, i) => (
          <li key={i} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm ${o.mine ? "bg-pink-50 font-extrabold ring-1 ring-brand-pink" : "bg-violet-50/60 font-semibold"}`}>
            <span>{i === 0 ? "🥇 " : `${i + 1}. `}{o.name}{o.mine ? " ⭐" : ""}{o.won ? " 🏆" : ""}</span>
            <b dir="ltr">{da(o.price)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ClientTrips() {
  const { sb } = useSession();
  const { t, w, date } = useI18n();
  const [trips, setTrips] = useState<PublicTrip[] | null>(null);
  const [mine, setMine] = useState<MyBid[]>([]);
  const [from, setFrom] = useState("");
  const [toF, setToF] = useState("");
  const [modal, setModal] = useState<{ trip: PublicTrip; mode: "accept" | "bid" } | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([sb.rpc("flixi_available_trips"), sb.rpc("flixi_my_trip_bids")]);
    setTrips((a.data as PublicTrip[]) ?? []);
    setMine((b.data as MyBid[]) ?? []);
  }, [sb]);
  useEffect(() => { load(); const i = setInterval(load, 10000); return () => clearInterval(i); }, [load]);

  async function withdraw(tripId: string) {
    setErr("");
    const { error } = await sb.rpc("flixi_trip_withdraw_bid", { p_trip: tripId });
    if (error) setErr(t(error.message));
    load();
  }

  if (!trips) return <Spinner />;
  const list = trips.filter((x) => (!from || x.from_wilaya === from) && (!toF || x.to_wilaya === toF));
  const myActive = mine.filter((m) => ["active", "won", "accepted"].includes(m.status));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">{t("Transporteurs disponibles")}</h1>
        <p className="text-sm text-slate-500">{t("Trajets annoncés par les transporteurs vérifiés. Acceptez leur prix ou enchérissez : le prix le plus élevé gagne.")}</p>
      </div>
      {err && <Alert>{err}</Alert>}

      {myActive.length > 0 && (
        <div className="card space-y-3 p-4">
          <h2 className="font-extrabold">🏷 {t("Mes enchères sur des trajets")}</h2>
          {myActive.map((m) => {
            const lead = m.status === "active" && m.best === m.price;
            return (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-violet-50/60 p-3 text-sm">
                <div>
                  <p className="font-extrabold">{w(m.from_wilaya)} → {w(m.to_wilaya)} · 🚚 {m.driver_first_name}</p>
                  <p className="text-xs text-slate-500">🗓 {t("{d} à {h}", { d: date(m.depart_date), h: m.depart_time.slice(0, 5) })} · {t("Mon offre : {p}", { p: da(m.price) })}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {m.status === "accepted" ? (
                    <Link href={m.order_id ? `/client/orders/${m.order_id}` : "/client"} className="badge bg-emerald-100 text-emerald-700">✔ {t("Accepté par le transporteur")} →</Link>
                  ) : m.status === "won" ? (
                    <span className="badge bg-amber-100 text-amber-800">🏆 {t("Vous avez gagné — en attente du transporteur")}</span>
                  ) : lead ? (
                    <span className="badge bg-emerald-100 text-emerald-700">🥇 {t("Vous êtes en tête")}</span>
                  ) : (
                    <span className="badge bg-rose-100 text-rose-700">{t("Dépassé — meilleure offre : {p}", { p: da(m.best ?? 0) })}</span>
                  )}
                  {m.status === "active" && <button onClick={() => withdraw(m.trip_id)} className="btn btn-danger !px-3 !py-1 text-xs">{t("Retirer")}</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card grid gap-3 p-4 sm:grid-cols-2">
        <select className="select" value={from} onChange={(e) => setFrom(e.target.value)}><option value="">{t("Départ : toutes les wilayas")}</option>{WILAYAS.map((x) => <option key={x.code} value={x.name}>{w(x.name)}</option>)}</select>
        <select className="select" value={toF} onChange={(e) => setToF(e.target.value)}><option value="">{t("Arrivée : toutes les wilayas")}</option>{WILAYAS.map((x) => <option key={x.code} value={x.name}>{w(x.name)}</option>)}</select>
      </div>

      {list.length === 0 ? <Empty icon="🚚" title={t("Aucun transporteur sur ce trajet")} text={t("Publiez tout de même votre commande : les transporteurs vous enverront des offres.")} /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((x) => {
            const biddingOpen = x.phase === "bidding";
            const lead = x.my_bid && x.my_bid.status === "active" && x.best === x.my_bid.price;
            return (
              <div key={x.id} className="card p-5">
                <div className="flex items-center justify-between">
                  <span className="badge bg-violet-100 text-violet-700">🚚 {x.driver_first_name}</span>
                  <span className="text-xs font-bold text-slate-500">{t(x.deliveries > 1 ? "{n} livraisons" : "{n} livraison", { n: x.deliveries })}</span>
                </div>
                <p className="mt-3 text-lg font-extrabold">{w(x.from_wilaya)} <span className="grad-text inline-block rtl:rotate-180">→</span> {w(x.to_wilaya)}</p>
                <p className="mt-1 text-sm text-slate-600">🗓 {t("{d} à {h}", { d: date(x.depart_date), h: x.depart_time.slice(0, 5) })} · {t(x.vehicle_type)}</p>
                {x.note && <p className="mt-2 text-sm text-slate-500">{x.note}</p>}

                <div className="mt-3 space-y-2">
                  {biddingOpen ? <AuctionBanner depart={departDate(x.depart_date, x.depart_time)} round={x.round} who="driver" />
                    : <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">🏆 {t("Enchère terminée — le transporteur confirme le gagnant")}</p>}
                  {x.price ? <p className="text-xs font-semibold text-slate-600">{t("Prix annoncé : {p}", { p: da(x.price) })}</p> : null}
                  <OfferList offers={x.offers} empty={t("Aucune offre pour l'instant")} title={t("Toutes les offres ({n})", { n: x.bids })} />
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  {x.is_mine ? <span className="badge bg-slate-100 text-slate-600">{t("Votre trajet")}</span>
                    : x.my_bid ? <span className={`badge ${lead ? "bg-emerald-100 text-emerald-700" : x.my_bid.status === "won" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-700"}`}>{x.my_bid.status === "won" ? `🏆 ${t("En attente du transporteur")}` : lead ? `🥇 ${t("Vous êtes en tête")}` : t("Dépassé")} · {da(x.my_bid.price)}</span>
                    : <span />}
                  {!x.is_mine && biddingOpen && (
                    <div className="flex flex-wrap gap-2">
                      {x.price ? <button type="button" onClick={() => setModal({ trip: x, mode: "accept" })} className="btn btn-ghost !px-3 !py-2 text-sm">✔ {t("Accepter {p}", { p: da(x.price) })}</button> : null}
                      <button type="button" onClick={() => setModal({ trip: x, mode: "bid" })} className="btn btn-primary !py-2 text-sm">🔨 {x.my_bid ? t("Modifier mon enchère") : t("Enchérir")}</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {modal && <TripBidModal trip={modal.trip} mode={modal.mode} sb={sb} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
    </div>
  );
}
