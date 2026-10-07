"use client";
import { useSession } from "@/components/Session";
import { Alert, Field } from "@/components/ui";
import SupportContact from "@/components/SupportContact";
import { useI18n } from "@/lib/i18n";

/** Profil en lecture seule : toute modification passe par l'accord de l'équipe. */
export default function Account() {
  const { profile } = useSession();
  const { t, date } = useI18n();
  return (
    <div className="card mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-2xl font-extrabold">{t("Mon compte")}</h1>
      <p className="text-sm text-slate-500">{t("Client depuis le {d}", { d: date(profile.created_at) })}</p>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("Prénom")}><input value={profile.first_name} disabled className="input bg-slate-50" /></Field>
        <Field label={t("Nom")}><input value={profile.last_name} disabled className="input bg-slate-50" /></Field>
      </div>
      <Field label={t("Téléphone")}><input value={profile.phone} disabled dir="ltr" className="input bg-slate-50 text-start" /></Field>
      <Field label={t("Email")}><input value={profile.email ?? ""} disabled dir="ltr" className="input bg-slate-50 text-start" /></Field>
      <Field label={t("Date de naissance")}><input value={profile.birth_date ? date(profile.birth_date) : "—"} disabled className="input bg-slate-50" /></Field>
      <Alert kind="info">🔒 {t("Votre profil ne peut être modifié qu'avec l'accord de l'équipe. Contactez le support pour toute modification.")}</Alert>
      <SupportContact />
    </div>
  );
}
