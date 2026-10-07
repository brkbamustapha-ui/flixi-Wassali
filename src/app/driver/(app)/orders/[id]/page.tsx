"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useSession } from "@/components/Session";
import { Alert, PriceBreakdown, Spinner } from "@/components/ui";
import { ORDER_STATUS, phoneDigits, hoursUntil, CANCEL_FREE_HOURS } from "@/lib/format";
import { ORDER_COLS, type Order } from "@/lib/supabase";
import OrderDetails from "@/components/OrderDetails";
import { findWilaya } from "@/lib/wilayas";
import { useI18n } from "@/lib/i18n";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <div className="h-[340px] animate-pulse rounded-2xl bg-violet-100" /> });
type Contacts = { client: { name: string; phone: string }; driver: { name: string; phone: string } };

export default function DriverOrder() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { sb } = useSession();
  const { t, w } = useI18n();
  const [order, setOrder] = useState<Order | null>(null);
  const [contacts, setContacts] = useState<Contacts | null>(null);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoErr, setGeoErr] = useState("");
  const [err, setErr] = useState("");
  const lastSent = useRef(0);
  const [mode, setMode] = useState<"" | "cancel" | "goods" | "noshow">("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data: o } = await sb.from("flixi_orders").select(ORDER_COLS).eq("id", id).maybeSingle();
    if (!o) return router.replace("/driver");
    setOrder(o as unknown as Order);
    const { data: c } = await sb.rpc("flixi_order_contacts", { p_order: id });
    setContacts(c as Contacts | null);
  }, [sb, id, router]);
  useEffect(() => { load(); }, [load]);

  const tracking = order && ["matched", "in_transit"].includes(order.status);
  useEffect(() => {
    if (!tracking) return;
    if (!navigator.geolocation) return setGeoErr(t("Géolocalisation non disponible sur cet appareil."));
    const w = navigator.geolocation.watchPosition(
      (p) => {
        setGeoErr("");
        const c = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPos(c);
        if (Date.now() - lastSent.current > 8000) {
          lastSent.current = Date.now();
          sb.rpc("flixi_update_location", { p_order: id, p_lat: c.lat, p_lng: c.lng });
        }
      },
      () => setGeoErr(t("Localisation désactivée : activez-la, elle est obligatoire pour suivre la marchandise.")),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(w);
  }, [tracking, sb, id, t]);

  async function act(fn: string) {
    setErr("");
    const { error } = await sb.rpc(fn, { p_order: id });
    if (error) setErr(t(error.message));
    load();
  }

  async function submitReason() {
    setErr(""); setBusy(true);
    const r = mode === "noshow"
      ? await sb.rpc("flixi_report_no_show", { p_order: id, p_reason: reason })
      : await sb.rpc("flixi_driver_cancel", { p_order: id, p_reason: reason, p_kind: mode === "goods" ? "goods_issue" : "normal" });
    setBusy(false);
    if (r.error) return setErr(t(r.error.message));
    setMode(""); setReason("");
    load();
  }
  async function answerCancel(accept: boolean) {
    setErr("");
    const { error } = await sb.rpc("flixi_answer_cancel", { p_order: id, p_accept: accept });
    if (error) setErr(t(error.message));
    load();
  }

  const markers = useMemo(() => {
    if (!order) return [];
    const m = [];
    { const a = order.from_lat != null ? { lat: order.from_lat, lng: order.from_lng! } : findWilaya(order.from_wilaya); if (a) m.push({ lat: a.lat, lng: a.lng, color: "#ff7a1a", emoji: "📍", label: t("Chargement : {w}", { w: w(order.from_wilaya) }) }); }
    { const z = order.to_lat != null ? { lat: order.to_lat, lng: order.to_lng! } : findWilaya(order.to_wilaya); if (z) m.push({ lat: z.lat, lng: z.lng, color: "#7b3ff2", emoji: "🏁", label: t("Livraison : {w}", { w: w(order.to_wilaya) }) }); }
    if (pos) m.push({ lat: pos.lat, lng: pos.lng, color: "#ff2e7e", emoji: "🚚", label: t("Ma position") });
    return m;
  }, [order, pos, t, w]);

  if (!order) return <Spinner />;
  const st = ORDER_STATUS[order.status];
  const price = order.final_price ?? order.client_price;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-5 lg:col-span-3">
        <div className="card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-500">{t(order.goods_type)}{order.weight_kg ? ` · ${order.weight_kg} kg` : ""}</p>
              <h1 className="mt-1 text-2xl font-extrabold">{w(order.from_wilaya)} <span className="grad-text inline-block rtl:rotate-180">→</span> {w(order.to_wilaya)}</h1>
              <p className="mt-1 text-sm text-slate-500">{order.from_address || "—"} → {order.to_address || "—"}</p>
              {order.description && <p className="mt-2 text-sm">{order.description}</p>}
              {order.urgent && <span className="badge mt-2 bg-rose-100 text-rose-700">⚡ {t("URGENT")}</span>}
            </div>
            <span className={`badge ${st.tone}`}>{t(st.label)}</span>
          </div>
          <OrderDetails order={order} sb={sb} />
        </div>
        <div className="card space-y-4 p-5 sm:p-6">
          <PriceBreakdown price={price} role="driver" />
          {contacts && (
            <div className="rounded-2xl bg-emerald-50 p-4">
              <p className="text-xs font-bold uppercase text-emerald-700">{t("Client")}</p>
              <p className="mt-1 font-extrabold">{contacts.client.name}</p>
              <div className="mt-3 flex gap-2">
                <a href={`tel:${phoneDigits(contacts.client.phone)}`} className="btn btn-ok !py-1.5 text-sm">📞 <bdi dir="ltr">{contacts.client.phone}</bdi></a>
                <a href={`https://wa.me/${phoneDigits(contacts.client.phone).replace(/^0/, "213").replace("+", "")}`} target="_blank" className="btn btn-ghost !py-1.5 text-sm">WhatsApp</a>
              </div>
            </div>
          )}
          {err && <Alert>{err}</Alert>}
          {geoErr && <Alert>{geoErr}</Alert>}
          {order.status === "matched" && <button onClick={() => act("flixi_start_transit")} className="btn btn-primary w-full !py-3">🚚 {t("J'ai chargé la marchandise — démarrer la course")}</button>}
          {order.status === "in_transit" && <button onClick={() => act("flixi_mark_delivered")} className="btn btn-ok w-full !py-3">✔ {t("Marchandise livrée")}</button>}
          {order.status === "delivered" && <Alert kind="ok">{t("Course terminée. Pensez à verser votre commission chaque samedi.")}</Alert>}
          {order.status === "cancelled" && <Alert>{t("Commande annulée par {who}. Motif : {r}", { who: order.cancel_by === "driver" ? t("le transporteur") : t("le client"), r: order.cancel_reason ?? "—" })}</Alert>}

          {order.cancel_status === "requested" && order.cancel_by === "client" && ["matched", "in_transit"].includes(order.status) && (
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm">
              <p className="font-extrabold">⚠ {t("Le client demande l'annulation de la course.")}</p>
              <p className="mt-1">{t("Motif : {r}", { r: order.cancel_reason ?? "" })}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => answerCancel(true)} className="btn btn-primary !py-1.5 text-sm">✔ {t("Accepter l'annulation")}</button>
                <button onClick={() => answerCancel(false)} className="btn btn-danger !py-1.5 text-sm">✖ {t("Refuser")}</button>
              </div>
            </div>
          )}
          {order.cancel_status === "requested" && order.cancel_by === "driver" && <Alert kind="info">⏳ {t("Votre demande d'annulation attend la réponse du client. L'équipe est alertée.")}</Alert>}
          {order.cancel_status === "refused" && order.cancel_by === "driver" && <Alert>{t("Le client a refusé l'annulation.")}</Alert>}

          {["matched", "in_transit"].includes(order.status) && order.cancel_status !== "requested" && (
            <div className="space-y-2 rounded-2xl border border-rose-100 bg-rose-50/40 p-4 text-sm">
              <p className="font-extrabold">{t("Un problème avec cette course ?")}</p>
              <div className="flex flex-wrap gap-2">
                {order.status === "matched" && <button onClick={() => setMode("cancel")} className="btn btn-ghost !py-1.5 text-sm">{t("Annuler la course")}</button>}
                <button onClick={() => setMode("goods")} className="btn btn-ghost !py-1.5 text-sm">⛔ {t("Marchandise interdite / dangereuse / non conforme")}</button>
                <button onClick={() => setMode("noshow")} className="btn btn-ghost !py-1.5 text-sm">🚫 {t("Le client n'a pas chargé la marchandise")}</button>
              </div>
              {mode && (
                <div className="rounded-xl bg-white p-3">
                  <p className="font-bold">
                    {mode === "cancel" && (hoursUntil(order.depart_date, order.depart_time) > CANCEL_FREE_HOURS
                      ? t("Plus de 24 h avant le départ : vous pouvez annuler. Votre justification est transmise au client et à l'équipe.")
                      : t("Moins de 24 h avant le départ : l'annulation doit être acceptée par le client. L'équipe est alertée ; une annulation abusive entraîne un avertissement (bannissement au bout de 2)."))}
                    {mode === "goods" && t("La course est annulée et signalée à l'équipe : indiquez ce qui est interdit, dangereux ou non conforme aux indications du client.")}
                    {mode === "noshow" && t("Signalez que le client ne charge pas : l'équipe vérifie, le client peut devoir 10 % du prix du transport et recevoir un avertissement (bannissement au bout de 2).")}
                  </p>
                  <textarea className="textarea mt-2" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("Justification (obligatoire)")} />
                  <div className="mt-2 flex gap-2">
                    <button disabled={busy || reason.trim().length < 5} onClick={submitReason} className="btn btn-danger !py-1.5 text-sm">{t("Envoyer")}</button>
                    <button onClick={() => { setMode(""); setReason(""); }} className="btn btn-ghost !py-1.5 text-sm">{t("Annuler")}</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="card space-y-3 p-4 lg:col-span-2 lg:sticky lg:top-24 lg:self-start">
        <p className="font-extrabold">{t("Itinéraire")} {tracking && <span className="badge ms-2 bg-emerald-100 text-emerald-700">● {t("GPS actif")}</span>}</p>
        <MapView height={360} markers={markers} line={markers.filter((m) => m.emoji !== "🚚").map((m) => [m.lat, m.lng] as [number, number])} />
        {tracking && <p className="text-xs text-slate-500">{t("Gardez cette page ouverte et la localisation activée : le client suit votre position en direct.")}</p>}
      </div>
    </div>
  );
}
