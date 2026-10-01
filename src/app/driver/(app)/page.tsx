"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/Session";
import { Alert, Empty, Spinner } from "@/components/ui";
import { COMMISSION, ORDER_STATUS, da } from "@/lib/format";
import type { Order } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";

type PendingBid = { id: string; price: number; order: Order };

export default function DriverHome() {
  const { sb, profile, driver } = useSession();
  const { t, w, date } = useI18n();
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
    if (error) setErr(t(error.message));
    load();
  }

  if (!orders || !driver) return <Spinner />;
  const active = orders.filter((o) => ["matched", "in_transit"].includes(o.status));
  const done = orders.filter((o) => o.status === "delivered");
  const earned = done.reduce((s, o) => s + (o.final_price ?? 0), 0);

  return (
    <div className="space-y-6">
      {driver.approval === "pending" && <Alert kind="info">⏳ {t("Votre dossier est en cours de vérification par l'équipe Flixi Tawsil. Vous pourrez proposer des prix dès son approbation.")}</Alert>}
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
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-extrabold">🔔 {t("Clients qui ont accepté votre prix")}</h2>
          {pending.map((p) => (
            <div key={p.id} className="card border-2 !border-brand-pink p-5">
              {p.order.direct_driver_id === profile.id && <span className="badge mb-1 bg-violet-100 text-violet-700">📌 {t("Réservation sur votre trajet")}</span>}
              <p className="font-extrabold">{t(p.order.goods_type)} · {w(p.order.from_wilaya)} → {w(p.order.to_wilaya)}</p>
              <p className="mt-1 text-sm">{t("Le client a accepté votre offre de {p}. Confirmez pour conclure et afficher les numéros de téléphone.", { p: da(p.price) })}</p>
              <p className="mt-1 text-xs text-slate-500">{t("Vous encaisserez {a} (dont {c} de commission Flixi à verser).", { a: da(p.price + COMMISSION), c: da(COMMISSION) })}</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => answer(p.id, true)} className="btn btn-primary !py-2 text-sm">✔ {t("Confirmer")}</button>
                <button onClick={() => answer(p.id, false)} className="btn btn-danger !py-2 text-sm">{t("Refuser")}</button>
              </div>
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
