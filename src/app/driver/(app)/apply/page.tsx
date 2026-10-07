"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/components/Session";
import { Alert, Field } from "@/components/ui";
import { VEHICLE_TYPES } from "@/lib/format";
import { compressImage } from "@/lib/images";
import { WILAYAS } from "@/lib/wilayas";
import { useI18n } from "@/lib/i18n";

type Key = "carte_grise_img" | "permis_img" | "selfie_img" | "vehicle_img" | "plate_img" | "controle_technique_img" | "assurance_img" | "registre_nif_img";
const DOCS: { key: Key; label: string; hint: string; capture?: "user" | "environment" }[] = [
  { key: "carte_grise_img", label: "Carte grise du véhicule", hint: "Prenez la carte grise en photo", capture: "environment" },
  { key: "permis_img", label: "Permis de conduire", hint: "Recto lisible", capture: "environment" },
  { key: "selfie_img", label: "Selfie", hint: "Votre visage, bien éclairé", capture: "user" },
  { key: "vehicle_img", label: "Photo du véhicule", hint: "Le véhicule entier", capture: "environment" },
  { key: "plate_img", label: "Photo de la plaque (matricule)", hint: "Plaque d'immatriculation lisible", capture: "environment" },
  { key: "controle_technique_img", label: "Contrôle technique", hint: "Attestation en cours de validité", capture: "environment" },
  { key: "assurance_img", label: "Assurance du véhicule", hint: "Attestation d'assurance en cours de validité", capture: "environment" },
  { key: "registre_nif_img", label: "Registre de commerce ou NIF", hint: "Document lisible (RC ou carte NIF)", capture: "environment" },
]; // libellés = clés de traduction

export default function Apply() {
  const { sb, profile, driver, refresh } = useSession();
  const router = useRouter();
  const { t, w } = useI18n();
  const [imgs, setImgs] = useState<Partial<Record<Key, string>>>({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [locOk, setLocOk] = useState<null | boolean>(null);

  useEffect(() => { if (driver) router.replace("/driver"); }, [driver, router]);

  async function pick(key: Key, file?: File) {
    if (!file) return;
    try { setImgs((s) => ({ ...s, [key]: undefined })); const d = await compressImage(file); setImgs((s) => ({ ...s, [key]: d })); }
    catch { setErr(t("Image illisible, réessayez.")); }
  }

  function askLocation() {
    if (!navigator.geolocation) return setLocOk(false);
    navigator.geolocation.getCurrentPosition(() => setLocOk(true), () => setLocOk(false), { enableHighAccuracy: true });
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    const f = new FormData(e.currentTarget);
    const missing = DOCS.filter((d) => !imgs[d.key]);
    if (missing.length) return setErr(t("Photos manquantes : {list}.", { list: missing.map((m) => t(m.label)).join(", ") }));
    if (!f.get("terms") || !f.get("resp") || !f.get("loc")) return setErr(t("Vous devez accepter toutes les conditions pour ouvrir un compte transporteur."));
    if (locOk !== true) return setErr(t("Activez la localisation de votre appareil : elle est obligatoire pour suivre la marchandise."));
    setBusy(true);
    const { error } = await sb.from("flixi_drivers").insert({
      user_id: profile.id, wilaya: String(f.get("wilaya")), vehicle_type: String(f.get("vehicle")), plate_number: String(f.get("plate")).trim(),
      license_kind: String(f.get("kind")), license_number: String(f.get("license")).trim(),
      carte_grise_img: imgs.carte_grise_img, permis_img: imgs.permis_img, selfie_img: imgs.selfie_img, vehicle_img: imgs.vehicle_img, plate_img: imgs.plate_img,
      controle_technique_img: imgs.controle_technique_img, assurance_img: imgs.assurance_img, registre_nif_img: imgs.registre_nif_img,
      registre_nif_kind: String(f.get("rnkind")), registre_nif_number: String(f.get("rnnum")).trim(),
      responsibility_accepted: true, location_consent: true,
    });
    if (error) { setBusy(false); return setErr(error.message); }
    await refresh();
    router.replace("/driver");
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-5">
      <div className="rounded-3xl bg-gradient-to-r from-violet-700 to-fuchsia-500 p-6 text-white shadow-lg">
        <h1 className="text-2xl font-extrabold">{t("Dossier transporteur")}</h1>
        <p className="mt-1 text-sm text-white/90">{t("Complétez ce formulaire une seule fois. Notre équipe vérifie vos documents avant d'activer votre compte.")}</p>
      </div>

      <div className="card space-y-4 p-5 sm:p-6">
        <h2 className="text-lg font-extrabold">{t("1. Véhicule et agrément")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Type de véhicule")}><select name="vehicle" className="select">{VEHICLE_TYPES.map((v) => <option key={v} value={v}>{t(v)}</option>)}</select></Field>
          <Field label={t("Matricule (plaque)")}><input name="plate" required dir="ltr" className="input text-start" placeholder="12345 118 16" /></Field>
          <Field label={t("Wilaya de résidence")}><select name="wilaya" className="select">{WILAYAS.map((x) => <option key={x.code} value={x.name}>{w(x.name)}</option>)}</select></Field>
          <Field label={t("Document professionnel")}>
            <select name="kind" className="select"><option value="agrement">{t("Licence / Agrément de transport")}</option></select>
          </Field>
        </div>
        <Field label={t("Numéro de la licence ou de l'agrément")}><input name="license" required dir="ltr" className="input text-start" /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("Registre de commerce ou NIF")}>
            <select name="rnkind" className="select"><option value="registre_commerce">{t("Registre de commerce")}</option><option value="nif">{t("NIF")}</option></select>
          </Field>
          <Field label={t("Numéro du registre de commerce ou du NIF")}><input name="rnnum" required dir="ltr" className="input text-start" /></Field>
        </div>
      </div>

      <div className="card space-y-4 p-5 sm:p-6">
        <h2 className="text-lg font-extrabold">{t("2. Photos obligatoires")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {DOCS.map((d) => (
            <label key={d.key} className={`block cursor-pointer rounded-2xl border-2 border-dashed p-3 text-center transition ${imgs[d.key] ? "border-emerald-300 bg-emerald-50" : "border-violet-200 hover:border-brand-pink"}`}>
              {imgs[d.key]
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={imgs[d.key]} alt={t(d.label)} className="mx-auto h-32 w-full rounded-xl object-cover" />
                : <div className="flex h-32 items-center justify-center text-4xl">📷</div>}
              <p className="mt-2 text-sm font-extrabold">{t(d.label)}</p>
              <p className="text-xs text-slate-500">{imgs[d.key] ? t("✔ Ajoutée — toucher pour changer") : t(d.hint)}</p>
              <input type="file" accept="image/*" capture={d.capture} className="hidden" onChange={(e) => pick(d.key, e.target.files?.[0])} />
            </label>
          ))}
        </div>
      </div>

      <div className="card space-y-4 p-5 sm:p-6">
        <h2 className="text-lg font-extrabold">{t("3. Localisation et conditions")}</h2>
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-violet-50 p-4">
          <button type="button" onClick={askLocation} className="btn btn-ghost text-sm">📍 {t("Activer ma localisation")}</button>
          {locOk === true && <span className="text-sm font-bold text-emerald-700">✔ {t("Localisation activée")}</span>}
          {locOk === false && <span className="text-sm font-bold text-rose-600">{t("Localisation refusée — autorisez-la dans votre navigateur.")}</span>}
        </div>
        {[
          ["loc", "Je m'engage à laisser ma localisation activée pendant toute livraison, afin que la marchandise soit suivie."],
          ["resp", "J'assume l'entière responsabilité de toute la marchandise que je transporte (perte, dommage, retard)."],
          ["terms", "J'ai lu et j'accepte les conditions d'utilisation de Flixi Wassali, dont la commission de 8 à 12 % par course payée chaque samedi."],
        ].map(([n, txt]) => (
          <label key={n} className="flex items-start gap-2 text-sm"><input name={n} type="checkbox" className="mt-1 h-4 w-4 accent-pink-600" /><span>{t(txt)}</span></label>
        ))}
        <p className="text-xs text-slate-500">{t("Sans ces acceptations, le compte transporteur ne peut pas être ouvert.")} <Link href="/conditions" target="_blank" className="font-bold text-brand-pink">{t("Lire les conditions")}</Link></p>
        {err && <Alert>{err}</Alert>}
        <button disabled={busy} className="btn btn-primary w-full !py-3.5 text-base">{busy ? t("Envoi du dossier…") : t("Envoyer mon dossier")}</button>
      </div>
    </form>
  );
}
