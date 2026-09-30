"use client";
import { FormEvent, useState } from "react";
import { useSession } from "@/components/Session";
import { Alert, Field } from "@/components/ui";
import { VEHICLE_TYPES, validPhoneDZ, dateFr } from "@/lib/format";
import { WILAYAS } from "@/lib/wilayas";

const APPROVAL = { pending: ["En vérification", "bg-amber-100 text-amber-800"], approved: ["Approuvé", "bg-emerald-100 text-emerald-700"], rejected: ["Refusé", "bg-rose-100 text-rose-700"] } as const;

export default function Account() {
  const { sb, profile, driver, refresh } = useSession();
  const [msg, setMsg] = useState<{ k: "ok" | "error"; t: string } | null>(null);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const phone = String(f.get("phone")).trim();
    if (!validPhoneDZ(phone)) return setMsg({ k: "error", t: "Numéro de téléphone algérien invalide." });
    const a = await sb.from("flixi_profiles").update({ first_name: String(f.get("first")).trim(), last_name: String(f.get("last")).trim(), phone }).eq("id", profile.id);
    const b = await sb.from("flixi_drivers").update({
      vehicle_type: String(f.get("vehicle")), plate_number: String(f.get("plate")).trim(), wilaya: String(f.get("wilaya")),
      license_number: String(f.get("license")).trim(),
    }).eq("user_id", profile.id);
    const error = a.error ?? b.error;
    if (error) return setMsg({ k: "error", t: error.message });
    setMsg({ k: "ok", t: "Compte mis à jour ✔" });
    refresh();
  }
  if (!driver) return null;
  const [label, tone] = APPROVAL[driver.approval];

  return (
    <form onSubmit={save} className="card mx-auto max-w-xl space-y-4 p-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-extrabold">Mon compte</h1><span className={`badge ${tone}`}>{label}</span></div>
      <p className="text-sm text-slate-500">Transporteur depuis le {dateFr(profile.created_at)}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prénom"><input name="first" required defaultValue={profile.first_name} className="input" /></Field>
        <Field label="Nom"><input name="last" required defaultValue={profile.last_name} className="input" /></Field>
      </div>
      <Field label="Téléphone"><input name="phone" required defaultValue={profile.phone} className="input" /></Field>
      <Field label="Email"><input value={profile.email ?? ""} disabled className="input bg-slate-50" /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Véhicule"><select name="vehicle" defaultValue={driver.vehicle_type} className="select">{VEHICLE_TYPES.map((v) => <option key={v}>{v}</option>)}</select></Field>
        <Field label="Matricule"><input name="plate" required defaultValue={driver.plate_number} className="input" /></Field>
        <Field label="Wilaya"><select name="wilaya" defaultValue={driver.wilaya ?? ""} className="select">{WILAYAS.map((w) => <option key={w.code}>{w.name}</option>)}</select></Field>
        <Field label="N° licence / agrément / RC"><input name="license" required defaultValue={driver.license_number} className="input" /></Field>
      </div>
      {msg && <Alert kind={msg.k}>{msg.t}</Alert>}
      <button className="btn btn-primary w-full">Enregistrer</button>
    </form>
  );
}
