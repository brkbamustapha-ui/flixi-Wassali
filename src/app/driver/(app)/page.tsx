"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/Session";
import { Alert, Empty, Spinner } from "@/components/ui";
import { ORDER_STATUS, da, commissionFor } from "@/lib/format";
import { ORDER_COLS, type Order } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";

type WinTrip = { id: string; from_wilaya: string; to_wilaya: string; depart_date: string; depart_time: string; phase: string; winning_bid_id: string | null; bids: { id: string; price: number; status: string; goods_type: string; description: string | null; weight_kg: number | null }[] };
type WonBid = { id: string; price: number; order: Order };

export default function DriverHome() {
  const { sb, profile, driver } = useSession();
  const { t, w, date } = useI18n();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [decisions, setDecisions] = useState<WinTrip[]>([]);
  const [waiting, setWaiting] = useState<WonBid[]>([]);
  const [unpaid, setUnpaid] = useState(0);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const { data: o } = await sb.from("flixi_orders").select(ORDER_COLS).eq("driver_id", profile.id).order("created_at", { ascending: false });
    await sb.rpc("flixi_settle_all");
    const { data: tr } = await sb.rpc("flixi_my_trips_overview");
    setDecisions(((tr as WinTrip[]) ?? []).filter((x) => x.phase === "awaiting_driver"));
    const { data: b } = await sb.from("flixi_bids").select("id,price,order_id").eq("status", "won");
    const ids = (b ?? []).map((x) => x.order_id);
    const { data: po } = ids.length ? await sb.from("flixi_orders").select(ORDER_COLS).in("id", ids).eq("status", "open") : { data: [] as Order[] };
    setWaiting((b ?? []).map((x) => ({ id: x.id, price: x.price, order: (po as unknown as Order[]).find((p) => p.id === x.order_id)! })).filter((x) => x.order));
    const { data: c } = await sb.from("flixi_commissions").select("amount").eq("status", "unpaid");
    setOrders((o as unknown as Order[]) ?? []);
    setUnpaid((c ?? []).reduce((s, x) => s + x.amount, 0));
  }, [sb, profile.id]);

  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);

  async function answer(tripId: string, ok: boolean) {
    setErr("");
    const { error } = await sb.rpc(ok ? "flixi_trip_accept_winner" : "flixi_trip_decline_winner", { p_trip: tripId });
    if (error) setErr(t(error.message));
    load();
  }

  if (!orders || !driver) return <Spinner />;
  const active = orders.filter((o) => ["matched", "in_transit"].includes(o.status));
  const done = orders.filter((o) => o.status === "delivered");
  const earned = done.reduce((s, o) => s + (o.final_price ?? 0), 0);

  return (
    <div className="space-y-6">
      {driver.approval === "pending" && <Alert kind="info">⏳ {t("Votre dossier est en cours de vérification par l'équipe Flixi Wassali. Vous pourrez proposer des prix dès son approbation.")}</Alert>}
      {driver.approval === "rejected" && <Alert>{t("Votre dossier a été refusé")}{driver.admin_note ? ` : ${driver.admin_note}` : "."} {t("Contactez le support.")}</Alert>}
      {driver.approval === "approved" && (
        <div className="rounded-3xl bg-gradient-to-r from-violet-700 to-fuchsia-500 p-6 text-white shadow-lg sm:p-8">
          <p className="text-sm font-bold opacity-90">{t("Bonjour {name}", { name: profile.first_name })} 👋</p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{t("Des marchandises attendent un transporteur.")}</h1>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/driver/requests" className="btn bg-white text-violet-700 shadow">📦 {t("Voir les demandes")}</Link>
            <Link href="/driver/trips" className="btn bg-white/20 text-white">🗓 {t("Annoncer un trajet")}</Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[[t("Courses en cours"), active.length], [t("Livrées"), done.length], [t("Gains (net)"), da(earned)], [t("Commissions à verser"), da(unpaid)]].map(([k, v]) => (
          <div key={String(k)} className="card p-4 text-center"><p className="grad-text text-2xl font-extrabold">{v}</p><p className="text-xs font-bold text-slate-500">{k}</p></div>
        ))}
      </div>

      {err && <Alert>{err}</Alert>}
      {decisions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-extrabold">🏆 {t("Enchères gagnées à confirmer")}</h2>
          {decisions.map((x) => {
            const win = x.bids.find((b) => b.id === x.winning_bid_id);
            if (!win) return null;
            return (
              <div key={x.id} className="card border-2 !border-brand-pink p-5">
                <p className="font-extrabold">{w(x.from_wilaya)} → {w(x.to_wilaya)} · 🗓 {t("{d} à {h}", { d: date(x.depart_date), h: x.depart_time.slice(0, 5) })}</p>
                <p className="mt-1 text-sm">{t("Un client a gagné l'enchère avec {p}. Acceptez pour conclure et afficher les numéros de téléphone ; si vous refusez, l'enchère recommence.", { p: da(win.price) })}</p>
                <p className="mt-1 text-xs text-slate-500">{t(win.goods_type)}{win.weight_kg ? ` · ${win.weight_kg} kg` : ""} — {t("Vous recevrez {a} net (commission de {c} à verser chaque samedi).", { a: da(win.price - commissionFor(win.price)), c: da(commissionFor(win.price)) })}</p>
                <div className="mt-3 flex gap-2">
                  <button onClick={() => answer(x.id, true)} className="btn btn-primary !py-2 text-sm">✔ {t("Confirmer")}</button>
                  <button onClick={() => answer(x.id, false)} className="btn btn-danger !py-2 text-sm">{t("Refuser")}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {waiting.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold">⏳ {t("Mes offres gagnantes — en attente du client")}</h2>
          {waiting.map((x) => (
            <div key={x.id} className="card flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
              <span className="font-extrabold">{t(x.order.goods_type)} · {w(x.order.from_wilaya)} → {w(x.order.to_wilaya)}</span>
              <span className="badge bg-amber-100 text-amber-800">{da(x.price)} · {t("en attente du client")}</span>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-xl font-extrabold">{t("Mes courses")}</h2>
      {orders.length === 0 ? <Empty icon="🚚" title={t("Aucune course pour le moment")} text={t("Proposez vos prix sur les demandes ouvertes.")} /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {orders.map((o) => (
            <Link key={o.id} href={`/driver/orders/${o.id}`} className="card p-5 transition hover:-translate-y-0.5">
              <div className="flex justify-between gap-2"><p className="font-extrabold">{t(o.goods_type)}</p><span className={`badge ${ORDER_STATUS[o.status].tone}`}>{t(ORDER_STATUS[o.status].label)}</span></div>
              <p className="mt-2 text-lg font-extrabold">{w(o.from_wilaya)} <span className="grad-text inline-block rtl:rotate-180">→</span> {w(o.to_wilaya)}</p>
              <p className="mt-2 text-sm font-bold">{t("À encaisser : {p}", { p: da((o.final_price ?? 0) + o.commission) })} <span className="font-normal text-slate-500">· {date(o.created_at)}</span></p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
