"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/Session";
import { Alert, Empty, Spinner } from "@/components/ui";
import { COMMISSION, ORDER_STATUS, da, dateFr } from "@/lib/format";
import type { Order } from "@/lib/supabase";

type PendingBid = { id: string; price: number; order: Order };

export default function DriverHome() {
  const { sb, profile, driver } = useSession();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [pending, setPending] = useState<PendingBid[]>([]);
  const [unpaid, setUnpaid] = useState(0);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const { data: o } = await sb.from("flixi_orders").select("*").eq("driver_id", profile.id).order("created_at", { ascending: false });
    const { data: b } = await sb.from("flixi_bids").select("id,price,order_id").eq("status", "client_accepted");
    const ids = (b ?? []).map((x) => x.order_id);
    const { data: po } = ids.length ? await sb.from("flixi_orders").select("*").in("id", ids) : { data: [] as Order[] };
    const { data: c } = await sb.from("flixi_commissions").select("amount").eq("status", "unpaid");
    setOrders((o as Order[]) ?? []);
    setPending((b ?? []).map((x) => ({ id: x.id, price: x.price, order: (po as Order[]).find((p) => p.id === x.order_id)! })).filter((x) => x.order));
    setUnpaid((c ?? []).reduce((s, x) => s + x.amount, 0));
  }, [sb, profile.id]);

  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);

  async function answer(id: string, ok: boolean) {
    setErr("");
    const { error } = await sb.rpc(ok ? "flixi_driver_confirm_bid" : "flixi_driver_decline_bid", { p_bid: id });
    if (error) setErr(error.message);
    load();
  }

  if (!orders || !driver) return <Spinner />;
  const active = orders.filter((o) => ["matched", "in_transit"].includes(o.status));
  const done = orders.filter((o) => o.status === "delivered");
  const earned = done.reduce((s, o) => s + (o.final_price ?? 0), 0);

  return (
    <div className="space-y-6">
      {driver.approval === "pending" && <Alert kind="info">⏳ Votre dossier est en cours de vérification par l'équipe Flixi Tawsil. Vous pourrez proposer des prix dès son approbation.</Alert>}
      {driver.approval === "rejected" && <Alert>Votre dossier a été refusé{driver.admin_note ? ` : ${driver.admin_note}` : "."} Contactez le support.</Alert>}
      {driver.approval === "approved" && (
        <div className="rounded-3xl bg-gradient-to-r from-violet-700 to-fuchsia-500 p-6 text-white shadow-lg sm:p-8">
          <p className="text-sm font-bold opacity-90">Bonjour {profile.first_name} 👋</p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">Des marchandises attendent un transporteur.</h1>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/driver/requests" className="btn bg-white text-violet-700 shadow">📦 Voir les demandes</Link>
            <Link href="/driver/trips" className="btn bg-white/20 text-white">🗓 Annoncer un trajet</Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Courses en cours", active.length], ["Livrées", done.length], ["Gains (net)", da(earned)], ["Commissions à verser", da(unpaid)]].map(([k, v]) => (
          <div key={String(k)} className="card p-4 text-center"><p className="grad-text text-2xl font-extrabold">{v}</p><p className="text-xs font-bold text-slate-500">{k}</p></div>
        ))}
      </div>

      {err && <Alert>{err}</Alert>}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-extrabold">🔔 Clients qui ont accepté votre prix</h2>
          {pending.map((p) => (
            <div key={p.id} className="card border-2 !border-brand-pink p-5">
              <p className="font-extrabold">{p.order.goods_type} · {p.order.from_wilaya} → {p.order.to_wilaya}</p>
              <p className="mt-1 text-sm">Le client a accepté votre offre de <b>{da(p.price)}</b>. Confirmez pour conclure et afficher les numéros de téléphone.</p>
              <p className="mt-1 text-xs text-slate-500">Vous encaisserez {da(p.price + COMMISSION)} (dont {da(COMMISSION)} de commission Flixi à verser).</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => answer(p.id, true)} className="btn btn-primary !py-2 text-sm">✔ Confirmer</button>
                <button onClick={() => answer(p.id, false)} className="btn btn-danger !py-2 text-sm">Refuser</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-xl font-extrabold">Mes courses</h2>
      {orders.length === 0 ? <Empty icon="🚚" title="Aucune course pour le moment" text="Proposez vos prix sur les demandes ouvertes." /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {orders.map((o) => (
            <Link key={o.id} href={`/driver/orders/${o.id}`} className="card p-5 transition hover:-translate-y-0.5">
              <div className="flex justify-between gap-2"><p className="font-extrabold">{o.goods_type}</p><span className={`badge ${ORDER_STATUS[o.status].tone}`}>{ORDER_STATUS[o.status].label}</span></div>
              <p className="mt-2 text-lg font-extrabold">{o.from_wilaya} <span className="grad-text">→</span> {o.to_wilaya}</p>
              <p className="mt-2 text-sm font-bold">À encaisser : {da((o.final_price ?? 0) + o.commission)} <span className="font-normal text-slate-500">· {dateFr(o.created_at)}</span></p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
