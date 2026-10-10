"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Alert } from "@/components/ui";
import { validPhoneDZ } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

type C = { id: string; kind: "phone" | "email"; value: string; verified: boolean; primary: boolean };

/** Plusieurs numéros et e-mails par compte ; chaque ajout est confirmé par un code (SMS / e-mail) envoyé automatiquement. */
export default function ContactsManager({ sb, onChanged }: { sb: SupabaseClient; onChanged?: () => void }) {
  const { t } = useI18n();
  const [list, setList] = useState<C[]>([]);
  const [kind, setKind] = useState<"phone" | "email">("phone");
  const [value, setValue] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ k: "ok" | "error" | "info"; t: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => { const { data } = await sb.rpc("flixi_my_contacts"); setList((data as C[]) ?? []); }, [sb]);
  useEffect(() => { load(); }, [load]);

  async function sendCode(id: string) {
    const { data: s } = await sb.auth.getSession();
    const r = await fetch("/api/contacts/send", { method: "POST", headers: { Authorization: `Bearer ${s.session?.access_token ?? ""}`, "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const j = (await r.json().catch(() => ({}))) as { sent?: boolean; channel?: string };
    setPending(id);
    setMsg(j.sent
      ? { k: "ok", t: j.channel === "sms" ? t("Un SMS avec le code de confirmation vient d'être envoyé.") : t("Un e-mail avec le code de confirmation vient d'être envoyé.") }
      : { k: "info", t: t("L'envoi automatique du code n'est pas encore activé : contactez le support pour confirmer ce contact.") });
  }

  async function add(e: FormEvent) {
    e.preventDefault();
    if (kind === "phone" && !validPhoneDZ(value)) return setMsg({ k: "error", t: t("Numéro de téléphone algérien invalide (ex : 0555 12 34 56).") });
    setBusy(true); setMsg(null);
    const { data, error } = await sb.rpc("flixi_add_contact", { p_kind: kind, p_value: value });
    if (error) { setBusy(false); return setMsg({ k: "error", t: t(error.message) }); }
    setValue("");
    await load();
    await sendCode(data as string);
    setBusy(false);
  }

  async function verify(id: string) {
    setBusy(true); setMsg(null);
    const { data, error } = await sb.rpc("flixi_verify_contact", { p_id: id, p_code: code });
    setBusy(false);
    if (error) return setMsg({ k: "error", t: t(error.message) });
    if (!data) return setMsg({ k: "error", t: t("Code incorrect.") });
    setPending(null); setCode(""); setMsg({ k: "ok", t: t("Contact confirmé ✔") });
    load();
  }
  async function resend(id: string) { setBusy(true); const { error } = await sb.rpc("flixi_resend_contact_code", { p_id: id }); if (!error) await sendCode(id); setBusy(false); }
  async function remove(id: string) { await sb.rpc("flixi_remove_contact", { p_id: id }); load(); }
  async function primary(id: string) { const { error } = await sb.rpc("flixi_set_primary_contact", { p_id: id }); if (error) setMsg({ k: "error", t: t(error.message) }); else { load(); onChanged?.(); } }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-extrabold">📞 {t("Numéros et e-mails")}</h2>
      <p className="text-xs text-slate-500">{t("Vous pouvez ajouter plusieurs numéros et e-mails. Chaque ajout est confirmé automatiquement par un code envoyé par SMS ou par e-mail.")}</p>
      {list.map((c) => (
        <div key={c.id} className="rounded-2xl border border-violet-100 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold" dir="ltr">{c.kind === "phone" ? "📞" : "✉"} {c.value}</span>
            <span className="flex flex-wrap items-center gap-1.5">
              {c.primary && <span className="badge bg-violet-100 text-violet-700">{t("Principal")}</span>}
              {c.verified ? <span className="badge bg-emerald-100 text-emerald-700">✔ {t("Confirmé")}</span> : <span className="badge bg-amber-100 text-amber-800">{t("À confirmer")}</span>}
              {c.verified && !c.primary && <button onClick={() => primary(c.id)} className="btn btn-ghost !px-2 !py-0.5 text-xs">{t("Définir comme principal")}</button>}
              <button onClick={() => remove(c.id)} className="btn btn-danger !px-2 !py-0.5 text-xs">{t("Supprimer")}</button>
            </span>
          </div>
          {!c.verified && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input className="input !w-32 !py-1.5 text-center tracking-widest" inputMode="numeric" maxLength={6} placeholder="000000" value={pending === c.id ? code : ""} onFocus={() => setPending(c.id)} onChange={(e) => { setPending(c.id); setCode(e.target.value.replace(/\D/g, "")); }} dir="ltr" />
              <button disabled={busy || code.length !== 6 || pending !== c.id} onClick={() => verify(c.id)} className="btn btn-primary !py-1.5 text-sm">{t("Confirmer")}</button>
              <button disabled={busy} onClick={() => resend(c.id)} className="btn btn-ghost !py-1.5 text-sm">{t("Renvoyer le code")}</button>
            </div>
          )}
        </div>
      ))}
      <form onSubmit={add} className="flex flex-wrap gap-2">
        <select className="select !w-auto" value={kind} onChange={(e) => setKind(e.target.value as "phone" | "email")}><option value="phone">{t("Numéro")}</option><option value="email">{t("E-mail")}</option></select>
        <input className="input !w-auto flex-1" required dir="ltr" type={kind === "email" ? "email" : "tel"} value={value} onChange={(e) => setValue(e.target.value)} placeholder={kind === "phone" ? "0555 12 34 56" : "nom@exemple.com"} />
        <button disabled={busy} className="btn btn-primary text-sm">＋ {t("Ajouter")}</button>
      </form>
      {msg && <Alert kind={msg.k === "info" ? "info" : msg.k}>{msg.t}</Alert>}
    </div>
  );
}
