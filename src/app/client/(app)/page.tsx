"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/Session";
import { Empty, Spinner } from "@/components/ui";
import { ORDER_STATUS, da } from "@/lib/format";
import type { Order } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";

type BidLite = { order_id: string; price: number; status: string };

export default function ClientHome() {
  const { sb, profile } = useSession();
  const { t, w, date } = useI18n();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [bids, setBids] = useState<BidLite[]>([]);

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data } = await sb.from("flixi_orders").select("*").eq("client_id", profile.id).order("created_at", { ascending: false });
      const { data: b } = await sb.from("flixi_bids").select("order_id,price,status").neq("status", "rejected");
      if (!alive) return;
      setOrders((data as Order[]) ?? []);
      setBids((b as BidLite[]) ?? []);
    }
    load();
    const t = setInterval(load, 10000);
    return () => { alive = false; clearInterval(t); };
  }, [sb, profile.id]);

  if (!orders) return <Spinner />;
  const stats = {
    open: orders.filter((o) => o.status === "open").length,
    active: orders.filter((o) => ["matched", "in_transit"].includes(o.status)).length,
    done: orders.filter((o) => o.status === "delivered").length,
  };

  return (
    <div className="space-y-6">
      <div className="grad-bg rounded-3xl p-6 text-white shadow-lg sm:p-8">
        <p className="text-sm font-bold opacity-90">{t("Bonjour {name}", { name: profile.first_name })} 👋</p>
        <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{t("Où voulez-vous envoyer votre marchandise ?")}</h1>
        <Link href="/client/new" className="btn mt-5 bg-white text-brand-pink shadow-lg">➕ {t("Nouvelle commande")}</Link>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[[t("En attente d'offres"), stats.open], [t("En cours"), stats.active], [t("Livrées"), stats.done]].map(([k, v]) => (
          <div key={k} className="card p-4 text-center"><p className="grad-text text-3xl font-extrabold">{v}</p><p className="text-xs font-bold text-slate-500">{k}</p></div>
        ))}
      </div>
      <h2 className="text-xl font-extrabold">{t("Mes commandes")}</h2>
      {orders.length === 0 ? (
        <Empty icon="📦" title={t("Aucune commande pour le moment")} text={t("Publiez votre première marchandise pour recevoir des offres.")} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {orders.map((o) => {
            const ob = bids.filter((b) => b.order_id === o.id);
            const best = ob.length ? Math.min(...ob.map((b) => b.price)) : null;
            const st = ORDER_STATUS[o.status];
            return (
              <Link key={o.id} href={`/client/orders/${o.id}`} className="card p-5 transition hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-extrabold">{t(o.goods_type)}</p>
                    <p className="text-xs text-slate-500">{date(o.created_at)}</p>
                  </div>
                  <span className={`badge ${st.tone}`}>{t(st.label)}</span>
                </div>
                <p className="mt-3 text-lg font-extrabold">{w(o.from_wilaya)} <span className="grad-text rtl:rotate-180 inline-block">→</span> {w(o.to_wilaya)}</p>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-bold">{o.final_price ? t("Prix convenu : {p}", { p: da(o.final_price) }) : t("Votre prix : {p}", { p: da(o.client_price) })}</span>
                  {o.status === "open" && <span className="badge bg-violet-100 text-violet-700">{t(ob.length > 1 ? "{n} offres" : "{n} offre", { n: ob.length })}{best ? ` · ${t("dès {p}", { p: da(best) })}` : ""}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
