"use client";
import { FormEvent, useState } from "react";
import { useSession } from "@/components/Session";
import { Alert, Field } from "@/components/ui";
import { VEHICLE_TYPES, validPhoneDZ } from "@/lib/format";
import { WILAYAS } from "@/lib/wilayas";
import { useI18n } from "@/lib/i18n";

const APPROVAL = { pending: ["En vérification", "bg-amber-100 text-amber-800"], approved: ["Approuvé", "bg-emerald-100 text-emerald-700"], rejected: ["Refusé", "bg-rose-100 text-rose-700"] } as const;

export default function Account() {
  const { sb, profile, driver, refresh } = useSession();
  const { t, w, date } = useI18n();
  const [msg, setMsg] = useState<{ k: "ok" | "error"; t: string } | null>(null);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const phone = String(f.get("phone")).trim();
    if (!validPhoneDZ(phone)) return setMsg({ k: "error", t: t("Numéro de téléphone algérien invalide.") });
    const a = await sb.from("flixi_profiles").update({ first_name: String(f.get("first")).trim(), last_name: String(f.get("last")).trim(), phone }).eq("id", profile.id);
    const b = await sb.from("flixi_drivers").update({
      vehicle_type: String(f.get("vehicle")), plate_number: String(f.get("plate")).trim(), wilaya: String(f.get("wilaya")),
      license_number: String(f.get("license")).trim(),
    }).eq("user_id", profile.id);
    const error = a.error ?? b.error;
    if (error) return setMsg({ k: "error", t: error.message });
    setMsg({ k: "ok", t: t("Compte mis à jour ✔") });
    refresh();
  }
  if (!driver) return null;
  const [label, tone] = APPROVAL[driver.approval];

  return (
    <form onSubmit={save} className="card mx-auto max-w-xl space-y-4 p-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-extrabold">{t("Mon compte")}</h1><span className={`badge ${tone}`}>{t(label)}</span></div>
      <p className="text-sm text-slate-500">{t("Transporteur depuis le {d}", { d: date(profile.created_at) })}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("Prénom")}><input name="first" required defaultValue={profile.first_name} className="input" /></Field>
        <Field label={t("Nom")}><input name="last" required defaultValue={profile.last_name} className="input" /></Field>
      </div>
      <Field label={t("Téléphone")}><input name="phone" required dir="ltr" defaultValue={profile.phone} className="input text-start" /></Field>
      <Field label={t("Email")}><input value={profile.email ?? ""} disabled dir="ltr" className="input bg-slate-50 text-start" /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("Véhicule")}><select name="vehicle" defaultValue={driver.vehicle_type} className="select">{VEHICLE_TYPES.map((v) => <option key={v} value={v}>{t(v)}</option>)}</select></Field>
        <Field label={t("Matricule")}><input name="plate" required dir="ltr" defaultValue={driver.plate_number} className="input text-start" /></Field>
        <Field label={t("Wilaya")}><select name="wilaya" defaultValue={driver.wilaya ?? ""} className="select">{WILAYAS.map((x) => <option key={x.code} value={x.name}>{w(x.name)}</option>)}</select></Field>
        <Field label={t("N° licence / agrément / RC")}><input name="license" required dir="ltr" defaultValue={driver.license_number} className="input text-start" /></Field>
      </div>
      {msg && <Alert kind={msg.k}>{msg.t}</Alert>}
      <button className="btn btn-primary w-full">{t("Enregistrer")}</button>
    </form>
  );
}
