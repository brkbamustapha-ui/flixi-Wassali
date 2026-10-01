"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useSession } from "@/components/Session";
import { Alert, Field, PriceBreakdown } from "@/components/ui";
import { GOODS_TYPES, MIN_PRICE, da, auctionPreview } from "@/lib/format";
import { WILAYAS, findWilaya, wilayaLabel } from "@/lib/wilayas";
import { useI18n } from "@/lib/i18n";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <div className="h-[340px] animate-pulse rounded-2xl bg-violet-100" /> });
type Pt = { lat: number; lng: number } | null;

export default function NewOrder() {
  const { sb, profile } = useSession();
  const router = useRouter();
  const { t, w, lang } = useI18n();
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
  const [dDate, setDDate] = useState("");
  const [dTime, setDTime] = useState("08:00");
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
  const preview = auctionPreview(dDate, dTime);
  const today = new Date().toISOString().slice(0, 10);

  const markers = useMemo(() => [
    { ...a, color: "#ff7a1a", emoji: "📍", label: t("Départ : {w}", { w: w(from) }) },
    { ...b, color: "#7b3ff2", emoji: "🏁", label: t("Arrivée : {w}", { w: w(to) }) },
  ], [a.lat, a.lng, b.lat, b.lng, from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  function locate() {
    navigator.geolocation?.getCurrentPosition(
      (p) => (placing === "from" ? setFromPt : setToPt)({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setErr(t("Impossible d'obtenir votre position. Cliquez sur la carte pour placer le point.")),
    );
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    if (from === to && !fromAddr) return setErr(t("Départ et arrivée sont dans la même wilaya : précisez les adresses."));
    if (!priceOk) return setErr(t("Le prix minimum est de {p}.", { p: da(MIN_PRICE) }));
    if (!preview) return setErr(t("Choisissez la date et l'heure de départ."));
    if (!preview.ok) return setErr(t("Le départ doit être dans plus de 2 heures."));
    setBusy(true);
    const { data, error } = await sb.from("flixi_orders").insert({
      client_id: profile.id, goods_type: goods, description: desc || null, weight_kg: weight ? Number(weight) : null,
      from_wilaya: from, from_address: fromAddr || null, from_lat: a.lat, from_lng: a.lng,
      to_wilaya: to, to_address: toAddr || null, to_lat: b.lat, to_lng: b.lng, client_price: priceN, depart_date: dDate, depart_time: dTime,
    }).select("id").single();
    if (error) { setBusy(false); return setErr(t(error.message)); }
    router.push(`/client/orders/${data.id}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-5">
      <div className="card space-y-4 p-5 sm:p-6 lg:col-span-3">
        <h1 className="text-2xl font-extrabold">{t("Nouvelle commande")}</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Type de marchandise")}><select className="select" value={goods} onChange={(e) => setGoods(e.target.value)}>{GOODS_TYPES.map((g) => <option key={g} value={g}>{t(g)}</option>)}</select></Field>
          <Field label={t("Poids approximatif (kg)")}><input className="input" type="number" min={0} value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={t("ex : 250")} /></Field>
        </div>
        <Field label={t("Description")}><textarea className="textarea" rows={2} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t("Dimensions, nombre de colis, fragile…")} /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3 rounded-2xl bg-orange-50/60 p-4">
            <Field label={"📍 " + t("Wilaya de départ")}><select className="select" value={from} onChange={(e) => setFrom(e.target.value)}>{WILAYAS.map((x) => <option key={x.code} value={x.name}>{wilayaLabel(x, lang)}</option>)}</select></Field>
            <Field label={t("Adresse de départ")}><input className="input" value={fromAddr} onChange={(e) => setFromAddr(e.target.value)} placeholder={t("Commune, rue…")} /></Field>
          </div>
          <div className="space-y-3 rounded-2xl bg-violet-50 p-4">
            <Field label={"🏁 " + t("Wilaya d'arrivée")}><select className="select" value={to} onChange={(e) => setTo(e.target.value)}>{WILAYAS.map((x) => <option key={x.code} value={x.name}>{wilayaLabel(x, lang)}</option>)}</select></Field>
            <Field label={t("Adresse d'arrivée")}><input className="input" value={toAddr} onChange={(e) => setToAddr(e.target.value)} placeholder={t("Commune, rue…")} /></Field>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={"🗓 " + t("Date de départ")}><input className="input" type="date" min={today} required value={dDate} onChange={(e) => setDDate(e.target.value)} dir="ltr" /></Field>
          <Field label={"🕗 " + t("Heure de départ")}><input className="input" type="time" required value={dTime} onChange={(e) => setDTime(e.target.value)} dir="ltr" /></Field>
        </div>
        {preview && (preview.ok
          ? <Alert kind="info">⏱ {t("Les transporteurs enchérissent jusqu'au {d}. Le prix le plus bas gagne, puis vous confirmez.", { d: preview.end.toLocaleString(lang === "fr" ? "fr-DZ" : lang === "en" ? "en-GB" : "ar-DZ-u-nu-latn", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) })}</Alert>
          : <Alert>{t("Le départ doit être dans plus de 2 heures.")}</Alert>)}
        <Field label={t("Votre prix (DA) — minimum {p}", { p: da(MIN_PRICE) })} hint={t("Les transporteurs peuvent accepter ce prix ou proposer moins cher. Vous choisissez la meilleure offre.")}>
          <input className="input !text-lg !font-extrabold" type="number" min={MIN_PRICE} step={100} required value={price} onChange={(e) => setPrice(e.target.value)} placeholder={t("ex : 8000")} dir="ltr" />
        </Field>
        {price && !priceOk && <Alert>{t("Le prix ne peut pas être inférieur à {p} (prix minimum du marché algérien).", { p: da(MIN_PRICE) })}</Alert>}
        {priceOk && <PriceBreakdown price={priceN} role="client" />}
        {err && <Alert>{err}</Alert>}
        <button disabled={busy || !priceOk} className="btn btn-primary w-full !py-3.5 text-base">{busy ? t("Publication…") : t("Publier ma commande")}</button>
      </div>
      <div className="card space-y-3 p-4 lg:col-span-2 lg:self-start lg:sticky lg:top-24">
        <p className="font-extrabold">{t("Carte")}</p>
        <div className="grid grid-cols-2 gap-2 text-sm font-bold">
          <button type="button" onClick={() => setPlacing("from")} className={`rounded-xl border-2 py-2 ${placing === "from" ? "border-brand-orange bg-orange-50" : "border-transparent bg-slate-50"}`}>📍 {t("Placer le départ")}</button>
          <button type="button" onClick={() => setPlacing("to")} className={`rounded-xl border-2 py-2 ${placing === "to" ? "border-brand-violet bg-violet-50" : "border-transparent bg-slate-50"}`}>🏁 {t("Placer l'arrivée")}</button>
        </div>
        <MapView height={340} markers={markers} line={[[a.lat, a.lng], [b.lat, b.lng]]} onPick={(lat, lng) => (placing === "from" ? setFromPt : setToPt)({ lat, lng })} />
        <button type="button" onClick={locate} className="btn btn-ghost w-full text-sm">🎯 {t("Utiliser ma position actuelle")}</button>
        <p className="text-xs text-slate-500">{t("Cliquez sur la carte pour préciser l'adresse exacte du point choisi.")}</p>
      </div>
    </form>
  );
}
