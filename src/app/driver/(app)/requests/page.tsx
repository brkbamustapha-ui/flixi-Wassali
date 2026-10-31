"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useSession } from "@/components/Session";
import { Alert, Empty, Spinner } from "@/components/ui";
import { AuctionBanner } from "@/components/Countdown";
import { MIN_PRICE, da, departDate, commissionFor, commissionRate, vehicleOk } from "@/lib/format";
import OrderDetails from "@/components/OrderDetails";
import { pingNow } from "@/lib/location";
import { WILAYAS, findWilaya, wilayasAlong } from "@/lib/wilayas";
import { useI18n } from "@/lib/i18n";
import { ORDER_COLS, type Order } from "@/lib/supabase";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <div className="h-[300px] animate-pulse rounded-2xl bg-violet-100" /> });
type Bid = { id: string; order_id: string; price: number; status: string };
type Offer = { price: number; mine: boolean; won: boolean };
type Stat = { order_id: string; best: number | null; count: number; phase: string; offers: Offer[] };

function OfferList({ offers, empty, title }: { offers: Offer[]; empty: string; title: string }) {
  const { t } = useI18n();
  if (!offers?.length) return <p className="text-xs font-semibold text-slate-500">{empty}</p>;
  return (
    <div>
      <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-slate-500">{title}</p>
      <ul className="max-h-40 space-y-1 overflow-y-auto pe-1">
        {offers.map((o, i) => (
          <li key={i} className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm ${o.mine ? "bg-pink-50 font-extrabold ring-1 ring-brand-pink" : "bg-violet-50/60 font-semibold"}`}>
            <span>{i === 0 ? "🥇 " : `${i + 1}. `}{o.mine ? t("Vous") : t("Offre")}{o.won ? " 🏆" : ""}</span>
            <b dir="ltr">{da(o.price)}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Aperçu avant d'envoyer l'enchère : le prix inclut la commission, voici ce que le transporteur touchera. */
function NetPreview({ value }: { value: string }) {
  const { t } = useI18n();
  const p = Number(value);
  if (!value || !Number.isFinite(p) || p < MIN_PRICE) return null;
  const c = commissionFor(p);
  return (
    <p className="rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-semibold text-violet-800">
      💰 {t("Prix {p} − commission {c} ({r} %) = vous recevrez {n}", { p: da(p), c: da(c), r: Math.round(commissionRate(p) * 100), n: da(p - c) })}
    </p>
  );
}

export default function Requests() {
  const { sb, profile, driver } = useSession();
  const { t, w, date } = useI18n();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [stats, setStats] = useState<Record<string, Stat>>({});
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [online, setOnline] = useState<number | null>(null);
  const [corr, setCorr] = useState(false);
  const approved = driver?.approval === "approved";

  const load = useCallback(async () => {
    await sb.rpc("flixi_settle_all");
    const { data: o } = await sb.from("flixi_orders").select(ORDER_COLS).eq("status", "open").neq("client_id", profile.id).order("created_at", { ascending: false });
    const list = (o as unknown as Order[]) ?? [];
    const { data: b } = await sb.from("flixi_bids").select("id,order_id,price,status").eq("driver_id", profile.id);
    const { data: s } = list.length ? await sb.rpc("flixi_order_stats", { p_ids: list.map((x) => x.id) }) : { data: [] };
    const { data: oc } = await sb.rpc("flixi_online_counts");
    setOnline((oc as { drivers: number } | null)?.drivers ?? null);
    setOrders(list);
    setBids((b as Bid[]) ?? []);
    setStats(Object.fromEntries(((s as Stat[]) ?? []).map((x) => [x.order_id, x])));
  }, [sb, profile.id]);
  useEffect(() => { load(); const i = setInterval(load, 8000); return () => clearInterval(i); }, [load]);

  const fail = (m: string) => setErr(/row-level security|violates/i.test(m) ? t("enchère terminée") : t(m));

  async function propose(o: Order, price: number) {
    setErr("");
    if (!Number.isFinite(price) || price < MIN_PRICE || !Number.isInteger(price)) return setErr(t("Indiquez un prix valide (nombre entier en DA)."));
    setBusy(o.id);
    if (!(await pingNow(sb))) { setBusy(""); return setErr(t("Position introuvable : activez la localisation de votre appareil puis réessayez.")); }
    const mine = bids.find((b) => b.order_id === o.id && b.status === "pending");
    const { error } = mine
      ? await sb.from("flixi_bids").update({ price }).eq("id", mine.id)
      : await sb.from("flixi_bids").insert({ order_id: o.id, driver_id: profile.id, price });
    if (error) fail(error.message);
    setBusy("");
    load();
  }
  async function buyNow(o: Order) {
    setErr(""); setBusy(o.id);
    if (!(await pingNow(sb))) { setBusy(""); return setErr(t("Position introuvable : activez la localisation de votre appareil puis réessayez.")); }
    const { error } = await sb.rpc("flixi_driver_buy_now", { p_order: o.id });
    if (error) fail(error.message);
    setBusy("");
    load();
  }
  async function withdraw(id: string) {
    await sb.from("flixi_bids").delete().eq("id", id);
    load();
  }

  // Filtre « adapter à mon trajet » : seules les demandes dont départ ET arrivée sont sur ma route (dans le bon sens)
  // Le trajet adapté = le départ et l'arrivée déjà choisis dans les filtres ci-dessus (aucune saisie en double)
  const route = useMemo(() => (corr && findWilaya(from) && findWilaya(to) && from !== to ? wilayasAlong(findWilaya(from)!, findWilaya(to)!).map((x) => x.name) : null), [corr, from, to]);
  const myVehicle = driver?.vehicle_type;
  // Adapter à mon trajet : le filtre départ/arrivée est remplacé par ma route (seules les demandes dont départ ET arrivée sont sur ma route, dans le bon sens).
  const fits = useMemo(() => (orders ?? []).filter((o) => vehicleOk(myVehicle, o.vehicle_wanted)), [orders, myVehicle]);
  const list = useMemo(() => fits.filter((o) => (route ? route.indexOf(o.from_wilaya) >= 0 && route.indexOf(o.to_wilaya) >= route.indexOf(o.from_wilaya) && route.indexOf(o.to_wilaya) >= 0 : (!from || o.from_wilaya === from) && (!to || o.to_wilaya === to))), [fits, from, to, route]);
  const hiddenByVehicle = (orders?.length ?? 0) - fits.length;
  const markers = useMemo(() => list.filter((o) => o.from_lat != null).map((o) => ({ lat: o.from_lat!, lng: o.from_lng!, color: "#ff2e7e", emoji: "📦", label: `${t(o.goods_type)} → ${w(o.to_wilaya)} · ${da(o.client_price)}` })), [list, t, w]);

  if (!orders) return <Spinner />;
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-extrabold">{t("Demandes de transport")}</h1><p className="text-sm text-slate-500">{t("Enchérissez sur les demandes : le prix le plus bas gagne, puis le client confirme. Vous pouvez aussi accepter directement le prix du client.")}</p></div>
      {!approved && <Alert kind="info">{t("Votre compte doit être approuvé par l'équipe Flixi Wassali avant de pouvoir proposer un prix.")}</Alert>}
      <p className="text-sm font-bold text-emerald-700">🟢 {t("{n} offre(s) client en ligne en ce moment", { n: fits.length })}</p>
      {err && <Alert>{err}</Alert>}


      <div className="card grid gap-3 p-4 sm:grid-cols-2">
        <select className="select" value={from} onChange={(e) => setFrom(e.target.value)}><option value="">{t("Départ : toutes les wilayas")}</option>{WILAYAS.map((x) => <option key={x.code} value={x.name}>{w(x.name)}</option>)}</select>
        <select className="select" value={to} onChange={(e) => setTo(e.target.value)}><option value="">{t("Arrivée : toutes les wilayas")}</option>{WILAYAS.map((x) => <option key={x.code} value={x.name}>{w(x.name)}</option>)}</select>
      </div>

      <div className="card space-y-3 p-4">
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="h-4 w-4 accent-pink-600" checked={corr} onChange={(e) => setCorr(e.target.checked)} />🧭 {t("Adapter les demandes à mon trajet (là où je veux aller)")}</label>
        {corr && !route && <p className="text-xs font-semibold text-amber-700">{t("Choisissez votre départ et votre arrivée dans les filtres ci-dessus : les demandes seront adaptées à ce trajet.")}</p>}
        {corr && route && <p className="text-xs font-semibold text-slate-600">{t("Demandes situées sur votre route : {r}", { r: route.map((n) => w(n)).join(" → ") })}</p>}
      </div>

      {(
        <>
          {hiddenByVehicle > 0 && <p className="rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">🚚 {t("{n} demande(s) masquée(s) : elles demandent un autre type de véhicule que le vôtre ({v}).", { n: hiddenByVehicle, v: t(myVehicle ?? "—") })}</p>}
          {markers.length > 0 && <MapView height={260} markers={markers} />}
          {list.length === 0 ? <Empty icon="📭" title={t("Aucune demande ouverte")} text={t("Revenez bientôt ou annoncez votre trajet.")} /> : (
            <div className="grid gap-4 md:grid-cols-2">
              {list.map((o) => {
                const st = stats[o.id];
                const myBid = bids.find((b) => b.order_id === o.id && ["pending", "won"].includes(b.status));
                const bidding = (st?.phase ?? o.phase) === "bidding";
                const p = prices[o.id] ?? "";
                const leading = myBid && st?.best === myBid.price;
                return (
                  <div key={o.id} className="card p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div><p className="text-xs font-extrabold text-brand-pink">{o.ref}</p><p className="font-extrabold">{t(o.goods_type)}{o.weight_kg ? ` · ${o.weight_kg} kg` : ""}</p><p className="text-xs text-slate-500">🗓 {o.depart_date ? t("{d} à {h}", { d: date(o.depart_date), h: (o.depart_time ?? "").slice(0, 5) }) : date(o.created_at)}</p></div>
                      <div className="flex flex-col items-end gap-1"><span className="badge bg-amber-100 text-amber-800">{t("Prix client : {p}", { p: da(o.client_price) })}</span>{o.urgent && <span className="badge bg-rose-100 text-rose-700">⚡ {t("URGENT")}</span>}</div>
                    </div>
                    <p className="mt-3 text-lg font-extrabold">{w(o.from_wilaya)} <span className="grad-text inline-block rtl:rotate-180">→</span> {w(o.to_wilaya)}</p>
                    {(o.from_address || o.to_address) && <p className="mt-1 text-xs text-slate-500">📍 {o.from_address || "—"} → 🏁 {o.to_address || "—"}</p>}
                    {o.description && <p className="mt-1 text-sm text-slate-600">{o.description}</p>}
                    <OrderDetails order={o} sb={sb} maps />

                    <div className="mt-3 space-y-2">
                      {bidding ? <AuctionBanner depart={o.depart_date ? departDate(o.depart_date, o.depart_time ?? "00:00") : null} round={o.auction_round} who="client" />
                        : <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">🏆 {t("Enchère terminée — le client confirme le gagnant")}</p>}
                      <OfferList offers={st?.offers ?? []} empty={t("Aucune offre pour l'instant")} title={t("Toutes les offres ({n})", { n: st?.count ?? 0 })} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{t("Votre prix doit inclure la commission de la plateforme (8 à 12 % selon le montant) : vous voyez ci-dessous ce que vous toucherez.")}</p>

                    {myBid && (
                      <div className={`mt-3 rounded-xl p-3 text-sm ${myBid.status === "won" ? "bg-amber-50" : leading ? "bg-emerald-50" : "bg-rose-50"}`}>
                        <p className="font-bold">
                          {t("Votre offre : {p}", { p: da(myBid.price) })} — {myBid.status === "won" ? `🏆 ${t("gagnante, en attente du client")}` : leading ? `🥇 ${t("vous êtes en tête")}` : `${t("dépassée")} (${t("meilleure : {p}", { p: da(st?.best ?? 0) })})`}
                        </p>
                        {myBid.status === "pending" && bidding && (
                          <div className="mt-2 flex gap-2">
                            <input type="number" min={MIN_PRICE} step={1} className="input !py-1.5" placeholder={t("Nouveau prix")} value={p} dir="ltr" onChange={(e) => setPrices({ ...prices, [o.id]: e.target.value })} />
                            <button disabled={busy === o.id || !p} onClick={() => propose(o, Number(p))} className="btn btn-ghost !py-1.5 text-sm">{t("Modifier")}</button>
                            <button onClick={() => withdraw(myBid.id)} className="btn btn-danger !py-1.5 text-sm">{t("Retirer")}</button>
                          </div>
                        )}
                        {myBid.status === "pending" && bidding && <div className="mt-2"><NetPreview value={p} /></div>}
                      </div>
                    )}

                    {!myBid && bidding && (
                      <div className="mt-4 space-y-2">
                        <button disabled={!approved || busy === o.id} onClick={() => buyNow(o)} className="btn btn-primary w-full !py-2 text-sm">✔ {t("Accepter {p}", { p: da(o.client_price) })}</button>
                        <div className="flex gap-2">
                          <input type="number" min={MIN_PRICE} step={1} className="input !py-2" placeholder={t("Mon prix (DA)")} value={p} dir="ltr" onChange={(e) => setPrices({ ...prices, [o.id]: e.target.value })} />
                          <button disabled={!approved || busy === o.id || !p} onClick={() => propose(o, Number(p))} className="btn btn-ghost !py-2 text-sm whitespace-nowrap">🔨 {t("Enchérir")}</button>
                        </div>
                        <NetPreview value={p} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

    </div>
  );
}
