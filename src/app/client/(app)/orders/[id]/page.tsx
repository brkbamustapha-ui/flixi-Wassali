"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useSession } from "@/components/Session";
import { Alert, PriceBreakdown, Spinner } from "@/components/ui";
import { ORDER_STATUS, da, dateTimeFr, phoneDigits } from "@/lib/format";
import type { Order } from "@/lib/supabase";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <div className="h-[340px] animate-pulse rounded-2xl bg-violet-100" /> });

type Bid = { id: string; price: number; note: string | null; status: string; driver_first_name: string; vehicle_type: string; wilaya: string | null; deliveries: number };
type Contacts = { client: { name: string; phone: string }; driver: { name: string; phone: string; vehicle_type: string; plate_number: string } };
type Loc = { lat: number; lng: number; updated_at: string } | null;

export default function ClientOrder() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { sb } = useSession();
  const [order, setOrder] = useState<Order | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [contacts, setContacts] = useState<Contacts | null>(null);
  const [loc, setLoc] = useState<Loc>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const { data: o } = await sb.from("flixi_orders").select("*").eq("id", id).maybeSingle();
    if (!o) return router.replace("/client");
    setOrder(o as Order);
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
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  async function act(key: string, fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(key); setErr("");
    const { error } = await fn();
    if (error) setErr(error.message);
    await load();
    setBusy("");
  }

  const markers = useMemo(() => {
    if (!order) return [];
    const m = [];
    if (order.from_lat != null) m.push({ lat: order.from_lat, lng: order.from_lng!, color: "#ff7a1a", emoji: "📍", label: `Départ : ${order.from_wilaya}` });
    if (order.to_lat != null) m.push({ lat: order.to_lat, lng: order.to_lng!, color: "#7b3fff", emoji: "🏁", label: `Arrivée : ${order.to_wilaya}` });
    if (loc) m.push({ lat: loc.lat, lng: loc.lng, color: "#ff2e7e", emoji: "🚚", label: "Votre marchandise" });
    return m;
  }, [order, loc]);

  if (!order) return <Spinner />;
  const st = ORDER_STATUS[order.status];
  const waiting = bids.find((b) => b.status === "client_accepted");
  const best = bids.length ? Math.min(...bids.map((b) => b.price)) : null;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-5 lg:col-span-3">
        <div className="card p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-500">{order.goods_type}{order.weight_kg ? ` · ${order.weight_kg} kg` : ""}</p>
              <h1 className="mt-1 text-2xl font-extrabold">{order.from_wilaya} <span className="grad-text">→</span> {order.to_wilaya}</h1>
              {(order.from_address || order.to_address) && <p className="mt-1 text-sm text-slate-500">{order.from_address || "—"} → {order.to_address || "—"}</p>}
              {order.description && <p className="mt-2 text-sm">{order.description}</p>}
            </div>
            <span className={`badge ${st.tone}`}>{st.label}</span>
          </div>
          <p className="mt-4 text-sm font-bold">Votre prix de départ : {da(order.client_price)}</p>
        </div>

        {err && <Alert>{err}</Alert>}

        {order.status === "open" && (
          <div className="card p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Offres des transporteurs ({bids.length})</h2>
              <button onClick={() => act("cancel", () => sb.rpc("flixi_cancel_order", { p_order: id }))} disabled={!!busy} className="btn btn-danger !py-1.5 text-sm">Annuler la commande</button>
            </div>
            {waiting && <div className="mt-3"><Alert kind="info">⏳ Vous avez accepté l'offre de {waiting.driver_first_name} ({da(waiting.price)}). En attente de la confirmation du transporteur.</Alert></div>}
            {bids.length === 0 ? (
              <p className="mt-4 rounded-xl bg-violet-50 p-6 text-center text-sm text-slate-600">Aucune offre pour l'instant. Les transporteurs vérifiés voient votre commande — revenez dans quelques minutes.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {bids.map((b) => (
                  <div key={b.id} className={`rounded-2xl border-2 p-4 ${b.price === best ? "border-emerald-300 bg-emerald-50/50" : "border-violet-100"} ${b.status === "client_accepted" ? "!border-brand-pink" : ""}`}>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-extrabold">🚚 {b.driver_first_name} {b.price === best && <span className="badge ml-1 bg-emerald-100 text-emerald-700">Meilleur prix</span>}</p>
                        <p className="text-xs text-slate-500">{b.vehicle_type}{b.wilaya ? ` · ${b.wilaya}` : ""} · {b.deliveries} livraison{b.deliveries > 1 ? "s" : ""}</p>
                        {b.note && <p className="mt-1 text-sm">« {b.note} »</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-extrabold">{da(b.price)}</p>
                        <p className="text-xs font-bold text-slate-500">Total : {da(b.price + order.commission)}</p>
                      </div>
                    </div>
                    <button disabled={!!busy || b.status === "client_accepted"} onClick={() => act(b.id, () => sb.rpc("flixi_client_accept_bid", { p_bid: b.id }))} className="btn btn-primary mt-3 w-full !py-2 text-sm">
                      {b.status === "client_accepted" ? "✔ Acceptée — en attente du transporteur" : "Accepter cette offre"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {order.final_price && (
          <div className="card space-y-4 p-5 sm:p-6">
            <h2 className="text-lg font-extrabold">Commande conclue ✅</h2>
            <PriceBreakdown price={order.final_price} role="client" />
            {contacts && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-xs font-bold uppercase text-emerald-700">Votre transporteur</p>
                  <p className="mt-1 font-extrabold">{contacts.driver.name}</p>
                  <p className="text-xs text-slate-600">{contacts.driver.vehicle_type} · Matricule {contacts.driver.plate_number}</p>
                  <div className="mt-3 flex gap-2">
                    <a href={`tel:${phoneDigits(contacts.driver.phone)}`} className="btn btn-ok !py-1.5 text-sm">📞 {contacts.driver.phone}</a>
                    <a href={`https://wa.me/${phoneDigits(contacts.driver.phone).replace(/^0/, "213").replace("+", "")}`} target="_blank" className="btn btn-ghost !py-1.5 text-sm">WhatsApp</a>
                  </div>
                </div>
                <div className="rounded-2xl bg-violet-50 p-4">
                  <p className="text-xs font-bold uppercase text-violet-700">Vous</p>
                  <p className="mt-1 font-extrabold">{contacts.client.name}</p>
                  <p className="text-sm">{contacts.client.phone}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card space-y-3 p-4 lg:col-span-2 lg:sticky lg:top-24 lg:self-start">
        <p className="font-extrabold">{order.status === "in_transit" ? "🚚 Suivi en direct" : "Itinéraire"}</p>
        <MapView height={360} markers={markers} line={markers.filter((m) => m.emoji !== "🚚").map((m) => [m.lat, m.lng] as [number, number])} />
        {["matched", "in_transit"].includes(order.status) && (
          <p className="text-xs text-slate-500">{loc ? `Dernière position du transporteur : ${dateTimeFr(loc.updated_at)}` : "En attente de la position GPS du transporteur…"}</p>
        )}
      </div>
    </div>
  );
}
