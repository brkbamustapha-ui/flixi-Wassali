"use client";
import { FormEvent, useState } from "react";
import { useSession } from "@/components/Session";
import { Alert, Field } from "@/components/ui";
import { validPhoneDZ } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export default function Account() {
  const { sb, profile, refresh } = useSession();
  const { t, date } = useI18n();
  const [msg, setMsg] = useState<{ k: "ok" | "error"; t: string } | null>(null);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const phone = String(f.get("phone")).trim();
    if (!validPhoneDZ(phone)) return setMsg({ k: "error", t: t("Numéro de téléphone algérien invalide.") });
    const { error } = await sb.from("flixi_profiles").update({ first_name: String(f.get("first")).trim(), last_name: String(f.get("last")).trim(), phone }).eq("id", profile.id);
    if (error) return setMsg({ k: "error", t: error.message });
    setMsg({ k: "ok", t: t("Compte mis à jour ✔") });
    refresh();
  }

  return (
    <form onSubmit={save} className="card mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-2xl font-extrabold">{t("Mon compte")}</h1>
      <p className="text-sm text-slate-500">{t("Client depuis le {d}", { d: date(profile.created_at) })}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("Prénom")}><input name="first" required defaultValue={profile.first_name} className="input" /></Field>
        <Field label={t("Nom")}><input name="last" required defaultValue={profile.last_name} className="input" /></Field>
      </div>
      <Field label={t("Téléphone")}><input name="phone" required dir="ltr" defaultValue={profile.phone} className="input text-start" /></Field>
      <Field label={t("Email")}><input value={profile.email ?? ""} disabled dir="ltr" className="input bg-slate-50 text-start" /></Field>
      {msg && <Alert kind={msg.k}>{msg.t}</Alert>}
      <button className="btn btn-primary w-full">{t("Enregistrer")}</button>
    </form>
  );
}
