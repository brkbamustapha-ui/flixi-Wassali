"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useSession } from "@/components/Session";
import { Alert, Field, PriceBreakdown } from "@/components/ui";
import { GOODS_TYPES, MIN_PRICE, da } from "@/lib/format";
import { WILAYAS, findWilaya, wilayaLabel } from "@/lib/wilayas";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <div className="h-[340px] animate-pulse rounded-2xl bg-violet-100" /> });
type Pt = { lat: number; lng: number } | null;

export default function NewOrder() {
  const { sb, profile } = useSession();
  const router = useRouter();
  const [goods, setGoods] = useState(GOODS_TYPES[0]);
  const [desc, setDesc] = useState("");
  const [weight, setWeight] = useState("");
  const [from, setFrom] = useState("Alger");
  const [to, setTo] = useState("Oran");
  const [fromAddr, setFromAddr] = useState("");
  const [toAddr, setToAddr] = useState("");
  const [fromPt, setFromPt] = useState<Pt>(null);
  const [toPt, setToPt] = useState<Pt>(null);
  const [placing, setPlacing] = useState<"from" | "to">("from");
  const [price, setPrice] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get("from") && findWilaya(q.get("from"))) setFrom(q.get("from")!);
    if (q.get("to") && findWilaya(q.get("to"))) setTo(q.get("to")!);
  }, []);
  useEffect(() => setFromPt(null), [from]);
  useEffect(() => setToPt(null), [to]);

  const wf = findWilaya(from)!, wt = findWilaya(to)!;
  const a = fromPt ?? { lat: wf.lat, lng: wf.lng };
  const b = toPt ?? { lat: wt.lat, lng: wt.lng };
  const priceN = Number(price);
  const priceOk = Number.isFinite(priceN) && priceN >= MIN_PRICE;

  const markers = useMemo(() => [
    { ...a, color: "#ff7a1a", emoji: "📍", label: `Départ : ${from}` },
    { ...b, color: "#7b3ff2", emoji: "🏁", label: `Arrivée : ${to}` },
  ], [a.lat, a.lng, b.lat, b.lng, from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  function locate() {
    navigator.geolocation?.getCurrentPosition(
      (p) => (placing === "from" ? setFromPt : setToPt)({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setErr("Impossible d'obtenir votre position. Cliquez sur la carte pour placer le point."),
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    if (from === to && !fromAddr) return setErr("Départ et arrivée sont dans la même wilaya : précisez les adresses.");
    if (!priceOk) return setErr(`Le prix minimum est de ${da(MIN_PRICE)}.`);
    setBusy(true);
    const { data, error } = await sb.from("flixi_orders").insert({
      client_id: profile.id, goods_type: goods, description: desc || null, weight_kg: weight ? Number(weight) : null,
      from_wilaya: from, from_address: fromAddr || null, from_lat: a.lat, from_lng: a.lng,
      to_wilaya: to, to_address: toAddr || null, to_lat: b.lat, to_lng: b.lng, client_price: priceN,
    }).select("id").single();
    if (error) { setBusy(false); return setErr(error.message); }
    router.push(`/client/orders/${data.id}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-5">
      <div className="card space-y-4 p-5 sm:p-6 lg:col-span-3">
        <h1 className="text-2xl font-extrabold">Nouvelle commande</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type de marchandise"><select className="select" value={goods} onChange={(e) => setGoods(e.target.value)}>{GOODS_TYPES.map((g) => <option key={g}>{g}</option>)}</select></Field>
          <Field label="Poids approximatif (kg)"><input className="input" type="number" min={0} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="ex : 250" /></Field>
        </div>
        <Field label="Description"><textarea className="textarea" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Dimensions, nombre de colis, fragile…" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3 rounded-2xl bg-orange-50/60 p-4">
            <Field label="📍 Wilaya de départ"><select className="select" value={from} onChange={(e) => setFrom(e.target.value)}>{WILAYAS.map((w) => <option key={w.code} value={w.name}>{wilayaLabel(w)}</option>)}</select></Field>
            <Field label="Adresse de départ"><input className="input" value={fromAddr} onChange={(e) => setFromAddr(e.target.value)} placeholder="Commune, rue…" /></Field>
          </div>
          <div className="space-y-3 rounded-2xl bg-violet-50 p-4">
            <Field label="🏁 Wilaya d'arrivée"><select className="select" value={to} onChange={(e) => setTo(e.target.value)}>{WILAYAS.map((w) => <option key={w.code} value={w.name}>{wilayaLabel(w)}</option>)}</select></Field>
            <Field label="Adresse d'arrivée"><input className="input" value={toAddr} onChange={(e) => setToAddr(e.target.value)} placeholder="Commune, rue…" /></Field>
          </div>
        </div>
        <Field label={`Votre prix (DA) — minimum ${da(MIN_PRICE)}`} hint="Les transporteurs peuvent accepter ce prix ou proposer moins cher. Vous choisissez la meilleure offre.">
          <input className="input !text-lg !font-extrabold" type="number" min={MIN_PRICE} step={100} required value={price} onChange={(e) => setPrice(e.target.value)} placeholder="ex : 8000" />
        </Field>
        {price && !priceOk && <Alert>Le prix ne peut pas être inférieur à {da(MIN_PRICE)} (prix minimum du marché algérien).</Alert>}
        {priceOk && <PriceBreakdown price={priceN} role="client" />}
        {err && <Alert>{err}</Alert>}
        <button disabled={busy || !priceOk} className="btn btn-primary w-full !py-3.5 text-base">{busy ? "Publication…" : "Publier ma commande"}</button>
      </div>
      <div className="card space-y-3 p-4 lg:col-span-2 lg:self-start lg:sticky lg:top-24">
        <p className="font-extrabold">Carte</p>
        <div className="grid grid-cols-2 gap-2 text-sm font-bold">
          <button type="button" onClick={() => setPlacing("from")} className={`rounded-xl border-2 py-2 ${placing === "from" ? "border-brand-orange bg-orange-50" : "border-transparent bg-slate-50"}`}>📍 Placer le départ</button>
          <button type="button" onClick={() => setPlacing("to")} className={`rounded-xl border-2 py-2 ${placing === "to" ? "border-brand-violet bg-violet-50" : "border-transparent bg-slate-50"}`}>🏁 Placer l'arrivée</button>
        </div>
        <MapView height={340} markers={markers} line={[[a.lat, a.lng], [b.lat, b.lng]]} onPick={(lat, lng) => (placing === "from" ? setFromPt : setToPt)({ lat, lng })} />
        <button type="button" onClick={locate} className="btn btn-ghost w-full text-sm">🎯 Utiliser ma position actuelle</button>
        <p className="text-xs text-slate-500">Cliquez sur la carte pour préciser l'adresse exacte du point choisi.</p>
      </div>
    </form>
  );
}
