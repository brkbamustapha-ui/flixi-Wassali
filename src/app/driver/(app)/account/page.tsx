"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/Session";
import { Alert, Field } from "@/components/ui";
import ContactsManager from "@/components/ContactsManager";
import SupportContact from "@/components/SupportContact";
import { Stars } from "@/components/RatePanel";
import { VEHICLE_TYPES } from "@/lib/format";
import { WILAYAS } from "@/lib/wilayas";
import { useI18n } from "@/lib/i18n";

const APPROVAL = { pending: ["En vérification", "bg-amber-100 text-amber-800"], approved: ["Approuvé", "bg-emerald-100 text-emerald-700"], rejected: ["Refusé", "bg-rose-100 text-rose-700"] } as const;
type Req = { status: "pending" | "approved" | "rejected"; changes: Record<string, string>; note: string | null } | null;

/** Le transporteur modifie ses informations puis ENVOIE une demande de modification, validée par l'équipe. */
export default function Account() {
  const { sb, profile, driver, refresh } = useSession();
  const { t, w, date } = useI18n();
  const [vals, setVals] = useState<Record<string, string>>({});
  const [req, setReq] = useState<Req>(null);
  const [rating, setRating] = useState<{ avg: number; count: number } | null>(null);
  const [msg, setMsg] = useState<{ k: "ok" | "error" | "info"; t: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    sb.rpc("flixi_my_change_request").then(({ data }) => setReq((data as Req) ?? null));
    sb.rpc("flixi_avg_rating", { uid: profile.id }).then(({ data }) => setRating(data as { avg: number; count: number }));
  }, [sb, profile.id]);
  if (!driver) return null;
  const [label, tone] = APPROVAL[driver.approval];
  const current: Record<string, string> = { first_name: profile.first_name, last_name: profile.last_name, vehicle_type: driver.vehicle_type, plate_number: driver.plate_number, wilaya: driver.wilaya ?? "", license_number: driver.license_number };
  const val = (k: string) => vals[k] ?? current[k];
  const changed = Object.keys(current).filter((k) => vals[k] !== undefined && vals[k].trim() !== current[k]);
  const pending = req?.status === "pending";

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const { error } = await sb.rpc("flixi_submit_change", { p_changes: Object.fromEntries(changed.map((k) => [k, vals[k].trim()])) });
    setBusy(false);
    if (error) return setMsg({ k: "error", t: t(error.message) });
    setVals({});
    setMsg({ k: "ok", t: t("Demande de modification envoyée : l'équipe va l'examiner.") });
    sb.rpc("flixi_my_change_request").then(({ data }) => setReq((data as Req) ?? null));
  }
  const input = (k: string, extra = "") => <input value={val(k)} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} className={`input ${extra}`} />;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <form onSubmit={send} className="card space-y-4 p-6">
        <div className="flex items-center justify-between"><h1 className="text-2xl font-extrabold">{t("Mon compte")}</h1><span className={`badge ${tone}`}>{t(label)}</span></div>
        <p className="text-sm text-slate-500">{t("Transporteur depuis le {d}", { d: date(profile.created_at) })}{rating && rating.count > 0 ? <> · <Stars value={rating.avg} /> {rating.avg} ({rating.count})</> : null}</p>
        {profile.warnings > 0 && <Alert>{t("Avertissements : {n} / 2 — au bout de 2 avertissements, le compte est banni.", { n: profile.warnings })}</Alert>}
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Prénom")}>{input("first_name")}</Field>
          <Field label={t("Nom")}>{input("last_name")}</Field>
        </div>
        <Field label={t("Téléphone principal")}><input value={profile.phone} disabled dir="ltr" className="input bg-slate-50 text-start" /></Field>
        <Field label={t("Email")}><input value={profile.email ?? ""} disabled dir="ltr" className="input bg-slate-50 text-start" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("Véhicule")}><select value={val("vehicle_type")} onChange={(e) => setVals({ ...vals, vehicle_type: e.target.value })} className="select">{[...new Set([driver.vehicle_type, ...VEHICLE_TYPES])].map((v) => <option key={v} value={v}>{t(v)}</option>)}</select></Field>
          <Field label={t("Matricule")}>{input("plate_number", "text-start")}</Field>
          <Field label={t("Wilaya")}><select value={val("wilaya")} onChange={(e) => setVals({ ...vals, wilaya: e.target.value })} className="select">{WILAYAS.map((x) => <option key={x.code} value={x.name}>{w(x.name)}</option>)}</select></Field>
          <Field label={t("N° licence / agrément / RC")}>{input("license_number", "text-start")}</Field>
        </div>
        {pending && <Alert kind="info">⏳ {t("Une demande de modification est en cours d'examen par l'équipe.")}</Alert>}
        {req?.status === "rejected" && <Alert>{t("Votre dernière demande a été refusée.")}{req.note ? ` ${req.note}` : ""}</Alert>}
        {changed.length > 0 && !pending && (
          <button disabled={busy} className="btn btn-primary w-full">📨 {t("Envoyer la demande de modification")} ({changed.length})</button>
        )}
        {changed.length === 0 && !pending && <p className="text-xs text-slate-500">{t("Modifiez un champ : une icône « envoyer la demande de modification » apparaît. L'équipe valide avant que le changement soit appliqué.")}</p>}
      </form>
      {msg && <Alert kind={msg.k}>{msg.t}</Alert>}
      <div className="card p-6"><ContactsManager sb={sb} onChanged={refresh} /></div>
      <div className="card space-y-3 p-6">
        <Link href="/conditions" target="_blank" className="btn btn-ghost w-full text-sm">📄 {t("Relire les conditions d'utilisation")}</Link>
        <p className="text-sm font-bold">{t("Besoin d'aide ?")}</p><SupportContact />
      </div>
    </div>
  );
}
