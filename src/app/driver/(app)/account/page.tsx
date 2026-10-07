"use client";
import { useSession } from "@/components/Session";
import { Alert, Field } from "@/components/ui";
import SupportContact from "@/components/SupportContact";
import { useI18n } from "@/lib/i18n";

const APPROVAL = { pending: ["En vérification", "bg-amber-100 text-amber-800"], approved: ["Approuvé", "bg-emerald-100 text-emerald-700"], rejected: ["Refusé", "bg-rose-100 text-rose-700"] } as const;

/** Profil en lecture seule : toute modification passe par l'accord de l'équipe. */
export default function Account() {
  const { profile, driver } = useSession();
  const { t, w, date } = useI18n();
  if (!driver) return null;
  const [label, tone] = APPROVAL[driver.approval];
  const ro = "input bg-slate-50";
  return (
    <div className="card mx-auto max-w-xl space-y-4 p-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-extrabold">{t("Mon compte")}</h1><span className={`badge ${tone}`}>{t(label)}</span></div>
      <p className="text-sm text-slate-500">{t("Transporteur depuis le {d}", { d: date(profile.created_at) })}</p>
      {profile.warnings > 0 && <Alert>{t("Avertissements : {n} / 2 — au bout de 2 avertissements, le compte est banni.", { n: profile.warnings })}</Alert>}
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("Prénom")}><input value={profile.first_name} disabled className={ro} /></Field>
        <Field label={t("Nom")}><input value={profile.last_name} disabled className={ro} /></Field>
      </div>
      <Field label={t("Téléphone")}><input value={profile.phone} disabled dir="ltr" className={`${ro} text-start`} /></Field>
      <Field label={t("Email")}><input value={profile.email ?? ""} disabled dir="ltr" className={`${ro} text-start`} /></Field>
      <Field label={t("Date de naissance")}><input value={profile.birth_date ? date(profile.birth_date) : "—"} disabled className={ro} /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={t("Véhicule")}><input value={t(driver.vehicle_type)} disabled className={ro} /></Field>
        <Field label={t("Matricule")}><input value={driver.plate_number} disabled dir="ltr" className={`${ro} text-start`} /></Field>
        <Field label={t("Wilaya")}><input value={driver.wilaya ? w(driver.wilaya) : "—"} disabled className={ro} /></Field>
        <Field label={t("N° licence / agrément / RC")}><input value={driver.license_number} disabled dir="ltr" className={`${ro} text-start`} /></Field>
      </div>
      <Alert kind="info">🔒 {t("Votre profil ne peut être modifié qu'avec l'accord de l'équipe. Contactez le support pour toute modification.")}</Alert>
      <SupportContact />
    </div>
  );
}
