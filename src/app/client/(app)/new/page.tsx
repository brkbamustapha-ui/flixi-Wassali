"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useSession } from "@/components/Session";
import { Alert, Field, PriceBreakdown } from "@/components/ui";
import { GOODS_TYPES, VEHICLE_TYPES, AUCTION_HOURS, MIN_PRICE, auctionPreview } from "@/lib/format";
import { compressImage } from "@/lib/images";
import { WILAYAS, findWilaya, wilayaLabel, nearestWilaya, distKm } from "@/lib/wilayas";
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
  const [handling, setHandling] = useState(false);
  const [dims, setDims] = useState({ l: "", w: "", h: "" });
  const [img, setImg] = useState<string | null>(null);
  const [arrDate, setArrDate] = useState("");
  const [arrTime, setArrTime] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [hours, setHours] = useState("");
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
  const priceOk = Number.isFinite(priceN) && priceN >= MIN_PRICE && Number.isInteger(priceN);
  const preview = auctionPreview(dDate, dTime);
  const today = new Date().toISOString().slice(0, 10);

  const markers = useMemo(() => [
    { ...a, color: "#ff7a1a", emoji: "📍", label: t("Départ : {w}", { w: w(from) }) },
    { ...b, color: "#7b3ff2", emoji: "🏁", label: t("Arrivée : {w}", { w: w(to) }) },
  ], [a.lat, a.lng, b.lat, b.lng, from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  // Avertissement : le point choisi sur la carte semble hors de la wilaya indiquée
  const outside = (pt: Pt, wil: { name: string; lat: number; lng: number }) => {
    if (!pt) return null;
    const near = nearestWilaya(pt.lat, pt.lng);
    return near.name !== wil.name && distKm(pt, wil) > 60 ? near : null;
  };
  const fromOut = outside(fromPt, wf), toOut = outside(toPt, wt);

  async function pickImg(f?: File) {
    if (!f) return;
    try { setImg(await compressImage(f, 900, 0.65)); } catch { setErr(t("Image illisible, réessayez.")); }
  }

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
    if (!priceOk) return setErr(t("Indiquez un prix valide (nombre entier en DA)."));
    if (!preview) return setErr(t("Choisissez la date et l'heure de départ."));
    if (!preview.ok) return setErr(t("Le départ doit être dans au moins 10 minutes."));
    if (arrDate && arrDate < dDate) return setErr(t("La date d'arrivée souhaitée ne peut pas précéder le départ."));
    setBusy(true);
    const { data, error } = await sb.from("flixi_orders").insert({
      client_id: profile.id, goods_type: goods, description: desc || null, weight_kg: weight ? Number(weight) : null,
      from_wilaya: from, from_address: fromAddr || null, from_lat: a.lat, from_lng: a.lng,
      to_wilaya: to, to_address: toAddr || null, to_lat: b.lat, to_lng: b.lng, client_price: priceN, depart_date: dDate, depart_time: dTime,
      handling, goods_img: img, length_cm: dims.l ? Number(dims.l) : null, width_cm: dims.w ? Number(dims.w) : null, height_cm: dims.h ? Number(dims.h) : null,
      want_arrival_date: arrDate || null, want_arrival_time: arrDate && arrTime ? arrTime : null, vehicle_wanted: vehicle || null, auction_hours: hours ? Number(hours) : null,
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
        <div className="grid grid-cols-3 gap-3">
          <Field label={t("Longueur (cm)")}><input className="input" type="number" min={1} value={dims.l} onChange={(e) => setDims({ ...dims, l: e.target.value })} dir="ltr" /></Field>
          <Field label={t("Largeur (cm)")}><input className="input" type="number" min={1} value={dims.w} onChange={(e) => setDims({ ...dims, w: e.target.value })} dir="ltr" /></Field>
          <Field label={t("Hauteur (cm)")}><input className="input" type="number" min={1} value={dims.h} onChange={(e) => setDims({ ...dims, h: e.target.value })} dir="ltr" /></Field>
        </div>
        <label className="flex items-center gap-2 rounded-xl bg-violet-50 px-3 py-2.5 text-sm font-bold"><input type="checkbox" className="h-4 w-4 accent-pink-600" checked={handling} onChange={(e) => setHandling(e.target.checked)} />🏋 {t("Avec manutention (le transporteur aide à charger / décharger)")}</label>
        <label className={`block cursor-pointer rounded-2xl border-2 border-dashed p-3 text-center transition ${img ? "border-emerald-300 bg-emerald-50" : "border-violet-200 hover:border-brand-pink"}`}>
          {img
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={img} alt="" className="mx-auto h-36 w-full rounded-xl object-cover" />
            : <div className="py-5 text-4xl">📷</div>}
          <p className="mt-1 text-sm font-extrabold">{t("Photo de la marchandise")}</p>
          <p className="text-xs text-slate-500">{img ? t("✔ Ajoutée — toucher pour changer") : t("Aide le transporteur à estimer le prix réel")}</p>
          <input type="file" accept="image/*" className="hidden" onChange={(e) => pickImg(e.target.files?.[0])} />
        </label>
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
        {preview && !preview.ok && <Alert>{t("Le départ doit être dans au moins 10 minutes.")}</Alert>}
        {preview?.ok && preview.urgent && <Alert kind="info">⚡ {t("Départ dans moins de 2 heures : votre commande sera marquée URGENTE et mise en avant auprès des transporteurs.")}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={"🏁 " + t("Date d'arrivée souhaitée")}><input className="input" type="date" min={dDate || today} value={arrDate} onChange={(e) => setArrDate(e.target.value)} dir="ltr" /></Field>
          <Field label={"🕗 " + t("Heure d'arrivée souhaitée")}><input className="input" type="time" value={arrTime} onChange={(e) => setArrTime(e.target.value)} dir="ltr" disabled={!arrDate} /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={"🚚 " + t("Moyen de transport souhaité")}><select className="select" value={vehicle} onChange={(e) => setVehicle(e.target.value)}><option value="">{t("Indifférent")}</option>{VEHICLE_TYPES.map((v) => <option key={v} value={v}>{t(v)}</option>)}</select></Field>
          <Field label={"⏱ " + t("Durée de l'enchère")} hint={t("Chargement rapide ? Choisissez une durée : à l'échéance, la meilleure offre est retenue.")}>
            <select className="select" value={hours} onChange={(e) => setHours(e.target.value)}><option value="">{t("Jusqu'à ce que je la termine")}</option>{AUCTION_HOURS.map((h) => <option key={h} value={h}>{t("{h} h", { h })}</option>)}</select>
          </Field>
        </div>
        <Alert kind="info">🔓 {hours ? t("L'enchère est ouverte à tous les transporteurs pendant {h} h (vous pouvez la terminer avant). Le prix le plus bas gagne.", { h: hours }) : t("L'enchère reste ouverte à tous les transporteurs jusqu'à ce que VOUS la terminiez. Le prix le plus bas gagne.")}</Alert>
        <Field label={t("Votre prix (DA)")} hint={t("Prix libre. Les transporteurs peuvent accepter ce prix ou proposer moins cher. Vous ne payez que le prix convenu : la commission est à la charge du transporteur.")}>
          <input className="input !text-lg !font-extrabold" type="number" min={MIN_PRICE} step={1} required value={price} onChange={(e) => setPrice(e.target.value)} placeholder={t("ex : 8000")} dir="ltr" />
        </Field>
        {price && !priceOk && <Alert>{t("Indiquez un prix valide (nombre entier en DA).")}</Alert>}
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
        {fromOut && <Alert>⚠ {t("Le point de départ placé sur la carte semble être dans la wilaya de {a}, et non {b}. Vérifiez votre choix.", { a: w(fromOut.name), b: w(from) })}</Alert>}
        {toOut && <Alert>⚠ {t("Le point d'arrivée placé sur la carte semble être dans la wilaya de {a}, et non {b}. Vérifiez votre choix.", { a: w(toOut.name), b: w(to) })}</Alert>}
      </div>
    </form>
  );
}
