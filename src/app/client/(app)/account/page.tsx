"use client";
import { FormEvent, useState } from "react";
import { useSession } from "@/components/Session";
import { Alert, Field } from "@/components/ui";
import { validPhoneDZ, dateFr } from "@/lib/format";

export default function Account() {
  const { sb, profile, refresh } = useSession();
  const [msg, setMsg] = useState<{ k: "ok" | "error"; t: string } | null>(null);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const phone = String(f.get("phone")).trim();
    if (!validPhoneDZ(phone)) return setMsg({ k: "error", t: "Numéro de téléphone algérien invalide." });
    const { error } = await sb.from("flixi_profiles").update({ first_name: String(f.get("first")).trim(), last_name: String(f.get("last")).trim(), phone }).eq("id", profile.id);
    if (error) return setMsg({ k: "error", t: error.message });
    setMsg({ k: "ok", t: "Compte mis à jour ✔" });
    refresh();
  }

  return (
    <form onSubmit={save} className="card mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-2xl font-extrabold">Mon compte</h1>
      <p className="text-sm text-slate-500">Client depuis le {dateFr(profile.created_at)}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prénom"><input name="first" required defaultValue={profile.first_name} className="input" /></Field>
        <Field label="Nom"><input name="last" required defaultValue={profile.last_name} className="input" /></Field>
      </div>
      <Field label="Téléphone"><input name="phone" required defaultValue={profile.phone} className="input" /></Field>
      <Field label="Email"><input value={profile.email ?? ""} disabled className="input bg-slate-50" /></Field>
      {msg && <Alert kind={msg.k}>{msg.t}</Alert>}
      <button className="btn btn-primary w-full">Enregistrer</button>
    </form>
  );
}
