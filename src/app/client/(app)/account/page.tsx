"use client";
import { FormEvent, useEffect, useState } from "react";
import { useSession } from "@/components/Session";
import { Alert, Field } from "@/components/ui";
import ContactsManager from "@/components/ContactsManager";
import SupportContact from "@/components/SupportContact";
import { Stars } from "@/components/RatePanel";
import { useI18n } from "@/lib/i18n";

/** Le client modifie son profil librement (sans demande) ; changer l'e-mail de connexion envoie automatiquement un e-mail de confirmation. */
export default function Account() {
  const { sb, profile, refresh } = useSession();
  const { t, date } = useI18n();
  const [msg, setMsg] = useState<{ k: "ok" | "error" | "info"; t: string } | null>(null);
  const [rating, setRating] = useState<{ avg: number; count: number } | null>(null);
  const [newEmail, setNewEmail] = useState("");
  useEffect(() => { sb.rpc("flixi_avg_rating", { uid: profile.id }).then(({ data }) => setRating(data as { avg: number; count: number })); }, [sb, profile.id]);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const { error } = await sb.rpc("flixi_update_profile", { p_first: String(f.get("first")), p_last: String(f.get("last")) });
    if (error) return setMsg({ k: "error", t: t(error.message) });
    setMsg({ k: "ok", t: t("Compte mis à jour ✔") });
    refresh();
  }
  async function changeEmail(e: FormEvent) {
    e.preventDefault();
    const { error } = await sb.auth.updateUser({ email: newEmail.trim() }, { emailRedirectTo: `${location.origin}/auth/callback` });
    if (error) return setMsg({ k: "error", t: error.message });
    setNewEmail("");
    setMsg({ k: "info", t: t("Un e-mail de confirmation vient d'être envoyé : cliquez sur le lien pour valider le changement.") });
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <form onSubmit={save} className="card space-y-4 p-6">
        <h1 className="text-2xl font-extrabold">{t("Mon compte")}</h1>
        <p className="text-sm text-slate-500">{t("Client depuis le {d}", { d: date(profile.created_at) })}{rating && rating.count > 0 ? <> · <Stars value={rating.avg} /> {rating.avg} ({rating.count})</> : null}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Prénom")}><input name="first" required defaultValue={profile.first_name} className="input" /></Field>
          <Field label={t("Nom")}><input name="last" required defaultValue={profile.last_name} className="input" /></Field>
        </div>
        <Field label={t("Téléphone principal")}><input value={profile.phone} disabled dir="ltr" className="input bg-slate-50 text-start" /></Field>
        <Field label={t("Email")}><input value={profile.email ?? ""} disabled dir="ltr" className="input bg-slate-50 text-start" /></Field>
        <Field label={t("Date de naissance")}><input value={profile.birth_date ? date(profile.birth_date) : "—"} disabled className="input bg-slate-50" /></Field>
        <button className="btn btn-primary w-full">{t("Enregistrer")}</button>
      </form>
      <form onSubmit={changeEmail} className="card space-y-3 p-6">
        <h2 className="text-lg font-extrabold">✉ {t("Changer l'e-mail de connexion")}</h2>
        <div className="flex gap-2"><input className="input" type="email" required dir="ltr" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="nouveau@exemple.com" /><button className="btn btn-ghost text-sm">{t("Envoyer le lien")}</button></div>
      </form>
      {msg && <Alert kind={msg.k}>{msg.t}</Alert>}
      <div className="card p-6"><ContactsManager sb={sb} onChanged={refresh} /></div>
      <div className="card space-y-2 p-6"><p className="text-sm font-bold">{t("Besoin d'aide ?")}</p><SupportContact /></div>
    </div>
  );
}
