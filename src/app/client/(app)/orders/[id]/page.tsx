"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useSession } from "@/components/Session";
import { Alert, PriceBreakdown, Spinner } from "@/components/ui";
import { AuctionBanner } from "@/components/Countdown";
import { ORDER_STATUS, da, phoneDigits, departDate, hoursUntil, CANCEL_FREE_HOURS } from "@/lib/format";
import { ORDER_COLS, type Order } from "@/lib/supabase";
import OrderDetails from "@/components/OrderDetails";
import OrderChat from "@/components/OrderChat";
import RatePanel, { Stars } from "@/components/RatePanel";
import { findWilaya } from "@/lib/wilayas";
import { useI18n } from "@/lib/i18n";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <div className="h-[340px] animate-pulse rounded-2xl bg-violet-100" /> });

type Bid = { id: string; price: number; note: string | null; status: string; alias: string; vehicle_type: string; wilaya: string | null; deliveries: number; rating: number; rating_count: number; loc_ok: boolean };
type Contacts = { client: { name: string; phone: string }; driver: { name: string; phone: string; vehicle_type: string; plate_number: string } };
type Loc = { lat: number; lng: number; updated_at: string } | null;

export default function ClientOrder() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { sb } = useSession();
  const { t, w, dateTime } = useI18n();
  const [order, setOrder] = useState<Order | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [contacts, setContacts] = useState<Contacts | null>(null);
  const [loc, setLoc] = useState<Loc>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [online, setOnline] = useState<{ drivers: number } | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    const { data: o } = await sb.from("flixi_orders").select(ORDER_COLS).eq("id", id).maybeSingle();
    if (!o) return router.replace("/client");
    setOrder(o as unknown as Order);
    if (o.status === "open") {
      const { data } = await sb.rpc("flixi_order_bids", { p_order: id });
      setBids((data as Bid[]) ?? []);
    } else {
      const { data: c } = await sb.rpc("flixi_order_contacts", { p_order: id });
      setContacts(c as Contacts | null);
      if (o.status !== "delivered") {
        const { data: l } = await sb.rpc("flixi_get_location", { p_order: id });
        setLoc(l as Loc);
      }
    }
  }, [sb, id, router]);

  useEffect(() => {
    const o = () => sb.rpc("flixi_online_counts").then(({ data }: { data: { drivers: number } | null }) => setOnline(data));
    o();
    const oi = setInterval(o, 30000);
    return () => clearInterval(oi);
  }, [sb]);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function act(key: string, fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(key); setErr("");
    const { error } = await fn();
    if (error) setErr(t(error.message));
    await load();
    setBusy("");
  }

  const markers = useMemo(() => {
    if (!order) return [];
    const m = [];
    { const a = order.from_lat != null ? { lat: order.from_lat, lng: order.from_lng! } : findWilaya(order.from_wilaya); if (a) m.push({ lat: a.lat, lng: a.lng, color: "#ff7a1a", emoji: "📍", label: t("Départ : {w}", { w: w(order.from_wilaya) }) }); }
    { const z = order.to_lat != null ? { lat: order.to_lat, lng: order.to_lng! } : findWilaya(order.to_wilaya); if (z) m.push({ lat: z.lat, lng: z.lng, color: "#7b3fff", emoji: "🏁", label: t("Arrivée : {w}", { w: w(order.to_wilaya) }) }); }
    if (loc) m.push({ lat: loc.lat, lng: loc.lng, color: "#ff2e7e", emoji: "🚚", label: t("Votre marchandise") });
    return m;
  }, [order, loc, t, w]);

  if (!order) return <Spinner />;
  const st = ORDER_STATUS[order.status];
  const waiting = bids.find((b) => b.status === "client_accepted");
  const best = bids.length ? Math.min(...bids.map((b) => b.price)) : null;
  const winner = bids.find((b) => b.status === "won");

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-5 lg:col-span-3">
        <div className="card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-500">{t(order.goods_type)}{order.weight_kg ? ` · ${order.weight_kg} kg` : ""}</p>
              <p className="text-xs font-extrabold text-brand-pink">{order.ref}</p>
              <h1 className="mt-1 text-2xl font-extrabold">{w(order.from_wilaya)} <span className="grad-text inline-block rtl:rotate-180">→</span> {w(order.to_wilaya)}</h1>
              {(order.from_address || order.to_address) && <p className="mt-1 text-sm text-slate-500">{order.from_address || "—"} → {order.to_address || "—"}</p>}
              {order.description && <p className="mt-2 text-sm">{order.description}</p>}
              {order.urgent && <span className="badge mt-2 bg-rose-100 text-rose-700">⚡ {t("URGENT")}</span>}
            </div>
            <span className={`badge ${st.tone}`}>{t(st.label)}</span>
          </div>
          <p className="mt-4 text-sm font-bold">{t("Votre prix de départ : {p}", { p: da(order.client_price) })}</p>
          <OrderDetails order={order} sb={sb} />
        </div>

        {err && <Alert>{err}</Alert>}

        {order.status === "open" && (
          <div className="card space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold">{t("Offres des transporteurs")} ({bids.length})</h2>
              <button onClick={() => act("cancel", () => sb.rpc("flixi_client_cancel", { p_order: id, p_reason: null }))} disabled={!!busy} className="btn btn-danger !py-1.5 text-sm">{t("Annuler la commande")}</button>
            </div>

            {order.phase === "bidding" && (
              <>
                <AuctionBanner depart={order.depart_date ? departDate(order.depart_date, order.depart_time ?? "00:00") : null} round={order.auction_round} who="client" />
                <p className="text-xs font-semibold text-slate-500">🏆 {t("Tous les transporteurs en ligne peuvent enchérir. Vous choisissez librement qui transporte votre marchandise (pas forcément le moins cher), à tout moment.")}</p>
              </>
            )}

            {order.phase === "awaiting_client" && winner && (
              <div className="rounded-2xl border-2 border-brand-pink bg-pink-50/50 p-4">
                <p className="text-sm font-extrabold text-brand-pink">🏆 {t("Enchère terminée — offre gagnante")}</p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-extrabold">🚚 {t("Transporteur")} {winner.alias} {winner.rating_count > 0 && <Stars value={winner.rating} />}</p>
                    <p className="text-xs text-slate-500">{t(winner.vehicle_type)}{winner.wilaya ? ` · ${w(winner.wilaya)}` : ""} · {t(winner.deliveries > 1 ? "{n} livraisons" : "{n} livraison", { n: winner.deliveries })}</p>
                  </div>
                  <div className="text-end"><p className="text-xl font-extrabold">{da(winner.price)}</p></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button disabled={!!busy} onClick={async () => { await act("acc", () => sb.rpc("flixi_client_accept_bid", { p_bid: winner.id })); window.dispatchEvent(new Event("flixi:poll")); }} className="btn btn-primary !py-2 text-sm">✔ {t("Accepter cette offre")}</button>
                  <button disabled={!!busy} onClick={() => act("dec", () => sb.rpc("flixi_client_decline_bid", { p_bid: winner.id }))} className="btn btn-danger !py-2 text-sm">✖ {t("Refuser — relancer l'enchère")}</button>
                </div>
              </div>
            )}

            {bids.length === 0 ? (
              <p className="rounded-xl bg-violet-50 p-6 text-center text-sm text-slate-600">{t("Aucune offre pour l'instant. Les transporteurs vérifiés voient votre commande — revenez dans quelques minutes.")}</p>
            ) : (
              <div className="space-y-2">
                {bids.map((b) => (
                  <div key={b.id} className={`rounded-2xl border-2 p-3 ${b.status === "won" ? "border-brand-pink" : b.price === best ? "border-emerald-300 bg-emerald-50/50" : "border-violet-100"}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-extrabold">🚚 {t("Transporteur")} {b.alias} {b.rating_count > 0 && <><Stars value={b.rating} /> <span className="text-xs font-bold text-slate-500">({b.rating_count})</span></>} {b.price === best && <span className="badge ms-1 bg-emerald-100 text-emerald-700">{t("Meilleur prix")}</span>}</p>
                        <p className="text-xs text-slate-500">{t(b.vehicle_type)}{b.wilaya ? ` · ${w(b.wilaya)}` : ""} · {t(b.deliveries > 1 ? "{n} livraisons" : "{n} livraison", { n: b.deliveries })}</p>
                        {b.note && <p className="mt-1 text-sm">« {b.note} »</p>}
                      </div>
                      <div className="text-end"><p className="text-lg font-extrabold">{da(b.price)}</p></div>
                    </div>
                    {order.phase !== "closed" && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button disabled={!!busy} onClick={async () => { await act("choose", () => sb.rpc("flixi_client_choose_bid", { p_bid: b.id })); window.dispatchEvent(new Event("flixi:poll")); }} className="btn btn-primary !py-1.5 text-sm">✔ {t("Choisir ce transporteur")}</button>
                        {!b.loc_ok && <span className="text-xs font-semibold text-amber-700">📍 {t("Ce transporteur n'a pas partagé sa position récemment")}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {order.phase === "bidding" && (
              <div className="space-y-2">
                {online && <p className="text-xs font-bold text-emerald-700">🟢 {t("{n} transporteurs en ligne", { n: online.drivers })}</p>}
                {!confirmEnd ? (
                  <button disabled={!!busy || bids.length === 0} onClick={() => setConfirmEnd(true)} className="btn btn-primary w-full text-sm">🔨 {t("Terminer l'enchère")}</button>
                ) : (
                  <div className="rounded-xl border-2 border-brand-pink bg-pink-50/60 p-3 text-sm">
                    <p className="font-bold">{t("Terminer l'enchère maintenant ? L'offre la plus basse ({p}) gagnera.", { p: da(best ?? 0) })}</p>
                    <div className="mt-2 flex gap-2">
                      <button disabled={!!busy} onClick={async () => { await act("end", () => sb.rpc("flixi_order_end_auction", { p_order: id })); setConfirmEnd(false); window.dispatchEvent(new Event("flixi:poll")); }} className="btn btn-primary !py-1.5 text-sm">✔ {t("Oui, terminer")}</button>
                      <button onClick={() => setConfirmEnd(false)} className="btn btn-ghost !py-1.5 text-sm">{t("Annuler")}</button>
                    </div>
                  </div>
                )}
                {bids.length === 0 && <p className="text-xs text-slate-500">{t("Vous pourrez terminer l'enchère dès la première offre.")}</p>}
              </div>
            )}
          </div>
        )}

        {order.status === "cancelled" && order.cancel_reason && <Alert>{t("Commande annulée par {who}. Motif : {r}", { who: order.cancel_by === "driver" ? t("le transporteur") : t("le client"), r: order.cancel_reason })}</Alert>}
        {["matched", "in_transit", "delivered"].includes(order.status) && <OrderChat sb={sb} orderId={id} open={order.status !== "delivered"} />}
        {order.status === "delivered" && <RatePanel sb={sb} orderId={id} who="client" />}
        {order.status === "expired" && <Alert>{t("Cette commande a expiré : aucune offre n'a été retenue avant la date de départ.")}</Alert>}

        {order.final_price && (
          <div className="card space-y-4 p-5 sm:p-6">
            <h2 className="text-lg font-extrabold">{t("Commande conclue ✅")}</h2>
            <PriceBreakdown price={order.final_price} role="client" />
            <CancelBox order={order} busy={busy} act={act} sb={sb} id={id} cancelOpen={cancelOpen} setCancelOpen={setCancelOpen} reason={reason} setReason={setReason} />
            {contacts && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-xs font-bold uppercase text-emerald-700">{t("Votre transporteur")}</p>
                  <p className="mt-1 font-extrabold">{contacts.driver.name}</p>
                  <p className="text-xs text-slate-600">{t(contacts.driver.vehicle_type)} · {t("Matricule")} <bdi dir="ltr">{contacts.driver.plate_number}</bdi></p>
                  <div className="mt-3 flex gap-2">
                    <a href={`tel:${phoneDigits(contacts.driver.phone)}`} className="btn btn-ok !py-1.5 text-sm">📞 <bdi dir="ltr">{contacts.driver.phone}</bdi></a>
                    <a href={`https://wa.me/${phoneDigits(contacts.driver.phone).replace(/^0/, "213").replace("+", "")}`} target="_blank" className="btn btn-ghost !py-1.5 text-sm">WhatsApp</a>
                  </div>
                </div>
                <div className="rounded-2xl bg-violet-50 p-4">
                  <p className="text-xs font-bold uppercase text-violet-700">{t("Vous")}</p>
                  <p className="mt-1 font-extrabold">{contacts.client.name}</p>
                  <p className="text-sm" dir="ltr">{contacts.client.phone}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card space-y-3 p-4 lg:col-span-2 lg:sticky lg:top-24 lg:self-start">
        <p className="font-extrabold">{order.status === "in_transit" ? t("🚚 Suivi en direct") : t("Itinéraire")}</p>
        <MapView height={360} markers={markers} line={markers.filter((m) => m.emoji !== "🚚").map((m) => [m.lat, m.lng] as [number, number])} />
        {["matched", "in_transit"].includes(order.status) && (
          <p className="text-xs text-slate-500">{loc ? t("Dernière position du transporteur : {d}", { d: dateTime(loc.updated_at) }) : t("En attente de la position GPS du transporteur…")}</p>
        )}
      </div>
    </div>
  );
}

type CancelProps = {
  order: Order; busy: string; id: string; sb: ReturnType<typeof import("@/lib/supabase").supabase>;
  act: (k: string, fn: () => PromiseLike<{ error: { message: string } | null }>) => Promise<void>;
  cancelOpen: boolean; setCancelOpen: (v: boolean) => void; reason: string; setReason: (v: string) => void;
};
/** Annulation après conclusion : libre si > 24 h avant le départ, sinon demande à faire accepter par le transporteur. */
function CancelBox({ order, busy, act, sb, id, cancelOpen, setCancelOpen, reason, setReason }: CancelProps) {
  const { t } = useI18n();
  if (!["matched"].includes(order.status)) return null;
  const free = hoursUntil(order.depart_date, order.depart_time) > CANCEL_FREE_HOURS;
  if (order.cancel_status === "requested" && order.cancel_by === "driver") {
    return (
      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm">
        <p className="font-extrabold">⚠ {t("Le transporteur demande l'annulation de la course.")}</p>
        <p className="mt-1">{t("Motif : {r}", { r: order.cancel_reason ?? "" })}</p>
        <div className="mt-3 flex gap-2">
          <button disabled={!!busy} onClick={() => act("ans", () => sb.rpc("flixi_answer_cancel", { p_order: id, p_accept: true }))} className="btn btn-primary !py-1.5 text-sm">✔ {t("Accepter l'annulation")}</button>
          <button disabled={!!busy} onClick={() => act("ans", () => sb.rpc("flixi_answer_cancel", { p_order: id, p_accept: false }))} className="btn btn-danger !py-1.5 text-sm">✖ {t("Refuser")}</button>
        </div>
      </div>
    );
  }
  if (order.cancel_status === "requested") return <Alert kind="info">⏳ {t("Votre demande d'annulation attend la réponse du transporteur.")}</Alert>;
  return (
    <div className="space-y-2">
      {order.cancel_status === "refused" && <Alert>{t("Le transporteur a refusé l'annulation.")}</Alert>}
      {!cancelOpen ? (
        <button onClick={() => setCancelOpen(true)} className="btn btn-danger !py-1.5 text-sm">{free ? t("Annuler la course") : t("Demander l'annulation")}</button>
      ) : (
        <div className="rounded-xl border-2 border-rose-200 bg-rose-50/60 p-3 text-sm">
          <p className="font-bold">{free ? t("Annulation gratuite : plus de 24 h avant le départ.") : t("Moins de 24 h avant le départ : l'annulation doit être acceptée par le transporteur. Indiquez le motif.")}</p>
          <textarea className="textarea mt-2" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("Motif de l'annulation")} />
          <div className="mt-2 flex gap-2">
            <button disabled={!!busy || (!free && reason.trim().length < 5)} onClick={async () => { await act("cancel", () => sb.rpc("flixi_client_cancel", { p_order: id, p_reason: reason })); setCancelOpen(false); }} className="btn btn-danger !py-1.5 text-sm">{t("Confirmer")}</button>
            <button onClick={() => setCancelOpen(false)} className="btn btn-ghost !py-1.5 text-sm">{t("Annuler")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
