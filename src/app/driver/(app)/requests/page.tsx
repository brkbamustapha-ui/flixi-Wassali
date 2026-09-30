"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "@/components/Session";
import { Alert, Empty, Spinner } from "@/components/ui";
import { MIN_PRICE, COMMISSION, da } from "@/lib/format";
import { WILAYAS } from "@/lib/wilayas";
import type { Order } from "@/lib/supabase";
import { useI18n } from "@/lib/i18n";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <div className="h-[300px] animate-pulse rounded-2xl bg-violet-100" /> });
type Bid = { id: string; order_id: string; price: number; status: string };

export default function Requests() {
  const { sb, profile, driver } = useSession();
  const { t, w, date } = useI18n();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const approved = driver?.approval === "approved";

  const load = useCallback(async () => {
    const { data: o } = await sb.from("flixi_orders").select("*").eq("status", "open").order("created_at", { ascending: false });
    const { data: b } = await sb.from("flixi_bids").select("id,order_id,price,status").eq("driver_id", profile.id);
    setOrders((o as Order[]) ?? []);
    setBids((b as Bid[]) ?? []);
  }, [sb, profile.id]);
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);

  async function propose(o: Order, price: number) {
    setErr("");
    if (!Number.isFinite(price) || price < MIN_PRICE) return setErr(t("Le prix minimum est de {p}.", { p: da(MIN_PRICE) }));
    setBusy(o.id);
    const mine = bids.find((b) => b.order_id === o.id);
    const { error } = mine
      ? await sb.from("flixi_bids").update({ price }).eq("id", mine.id)
      : await sb.from("flixi_bids").insert({ order_id: o.id, driver_id: profile.id, price });
    if (error) setErr(t(error.message));
    setBusy("");
    load();
  }
  async function withdraw(id: string) {
    await sb.from("flixi_bids").delete().eq("id", id);
    load();
  }

  const list = useMemo(() => (orders ?? []).filter((o) => (!from || o.from_wilaya === from) && (!to || o.to_wilaya === to)), [orders, from, to]);
  const markers = useMemo(() => list.filter((o) => o.from_lat != null).map((o) => ({ lat: o.from_lat!, lng: o.from_lng!, color: "#ff2e7e", emoji: "📦", label: `${t(o.goods_type)} → ${w(o.to_wilaya)} · ${da(o.client_price)}` })), [list, t, w]);

  if (!orders) return <Spinner />;
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-extrabold">{t("Demandes de transport")}</h1><p className="text-sm text-slate-500">{t("Acceptez le prix du client ou proposez un meilleur prix : le prix le plus bas a plus de chances d'être choisi.")}</p></div>
      {!approved && <Alert kind="info">{t("Votre compte doit être approuvé par l'équipe Flixi Tawsil avant de pouvoir proposer un prix.")}</Alert>}
      {err && <Alert>{err}</Alert>}
      <div className="card grid gap-3 p-4 sm:grid-cols-2">
        <select className="select" value={from} onChange={(e) => setFrom(e.target.value)}><option value="">{t("Départ : toutes les wilayas")}</option>{WILAYAS.map((x) => <option key={x.code} value={x.name}>{w(x.name)}</option>)}</select>
        <select className="select" value={to} onChange={(e) => setTo(e.target.value)}><option value="">{t("Arrivée : toutes les wilayas")}</option>{WILAYAS.map((x) => <option key={x.code} value={x.name}>{w(x.name)}</option>)}</select>
      </div>
      {markers.length > 0 && <MapView height={280} markers={markers} />}
      {list.length === 0 ? <Empty icon="📭" title={t("Aucune demande ouverte")} text={t("Revenez bientôt ou annoncez votre trajet.")} /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((o) => {
            const mine = bids.find((b) => b.order_id === o.id);
            const p = prices[o.id] ?? "";
            return (
              <div key={o.id} className="card p-5">
                <div className="flex items-start justify-between gap-2">
                  <div><p className="font-extrabold">{t(o.goods_type)}{o.weight_kg ? ` · ${o.weight_kg} kg` : ""}</p><p className="text-xs text-slate-500">{date(o.created_at)}</p></div>
                  <span className="badge bg-amber-100 text-amber-800">{t("Prix client : {p}", { p: da(o.client_price) })}</span>
                </div>
                <p className="mt-3 text-lg font-extrabold">{w(o.from_wilaya)} <span className="grad-text inline-block rtl:rotate-180">→</span> {w(o.to_wilaya)}</p>
                {o.description && <p className="mt-1 text-sm text-slate-600">{o.description}</p>}
                <p className="mt-2 text-xs text-slate-500">{t("Vous encaisserez le prix + {c} (commission à reverser à Flixi).", { c: da(COMMISSION) })}</p>

                {mine ? (
                  <div className="mt-4 rounded-xl bg-violet-50 p-3 text-sm">
                    <p className="font-bold">{t("Votre offre : {p}", { p: da(mine.price) })} {mine.status === "client_accepted" ? t("— acceptée par le client 🎉") : t("— en attente du client")}</p>
                    {mine.status === "pending" && (
                      <div className="mt-2 flex gap-2">
                        <input type="number" min={MIN_PRICE} step={100} className="input !py-1.5" placeholder={t("Nouveau prix")} value={p} onChange={(e) => setPrices({ ...prices, [o.id]: e.target.value })} />
                        <button disabled={busy === o.id || !p} onClick={() => propose(o, Number(p))} className="btn btn-ghost !py-1.5 text-sm">{t("Modifier")}</button>
                        <button onClick={() => withdraw(mine.id)} className="btn btn-danger !py-1.5 text-sm">{t("Retirer")}</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 space-y-2">
                    <button disabled={!approved || busy === o.id} onClick={() => propose(o, o.client_price)} className="btn btn-primary w-full !py-2 text-sm">✔ {t("Accepter {p}", { p: da(o.client_price) })}</button>
                    <div className="flex gap-2">
                      <input type="number" min={MIN_PRICE} step={100} className="input !py-2" placeholder={t("Mon prix (≥ {m})", { m: MIN_PRICE })} value={p} onChange={(e) => setPrices({ ...prices, [o.id]: e.target.value })} />
                      <button disabled={!approved || busy === o.id || !p} onClick={() => propose(o, Number(p))} className="btn btn-ghost !py-2 text-sm whitespace-nowrap">{t("Proposer")}</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
