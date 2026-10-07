"use client";
import BirthDateField, { isAdult, readBirth } from "@/components/BirthDateField";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { validPhoneDZ } from "@/lib/format";
import { Alert, Field, Spinner } from "@/components/ui";
import { Logo } from "@/components/Logo";
import { useI18n } from "@/lib/i18n";

export default function Onboarding() {
  const router = useRouter();
  const { t } = useI18n();
  const [role, setRole] = useState<"client" | "driver">("client");
  const [ready, setReady] = useState(false);
  const [init, setInit] = useState({ first: "", last: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = supabase();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return router.replace("/");
      const { data: p } = await sb.from("flixi_profiles").select("role").eq("id", user.id).maybeSingle();
      if (p) return router.replace(`/${p.role}`);
      setRole(localStorage.getItem("flixi_role") === "driver" ? "driver" : "client");
      const full = String(user.user_metadata?.full_name ?? user.user_metadata?.name ?? "").split(" ");
      setInit({ first: full[0] ?? "", last: full.slice(1).join(" ") });
      setReady(true);
    })();
  }, [router]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const phone = String(f.get("phone")).trim();
    if (!validPhoneDZ(phone)) return setErr(t("Numéro de téléphone algérien invalide (ex : 0555 12 34 56)."));
    const birth = readBirth(f);
    if (!birth) return setErr(t("Date de naissance invalide."));
    if (!isAdult(birth)) return setErr(t("Vous devez avoir au moins 19 ans pour créer un compte."));
    if (!f.get("terms")) return setErr(t("Vous devez accepter les conditions d'utilisation."));
    setBusy(true); setErr("");
    const { error } = await supabase().rpc("flixi_complete_profile", {
      p_role: role, p_first: String(f.get("first")).trim(), p_last: String(f.get("last")).trim(), p_phone: phone, p_birth: birth,
    });
    if (error) { setBusy(false); return setErr(error.message); }
    router.replace(`/${role}`);
  }

  if (!ready) return <div className="grad-soft min-h-screen pt-32"><Spinner /></div>;
  return (
    <div className="grad-soft flex min-h-screen items-center justify-center px-4 py-10">
      <form onSubmit={submit} className="card w-full max-w-md space-y-4 p-6 sm:p-8">
        <div className="flex justify-center"><Logo size={42} /></div>
        <h1 className="text-center text-xl font-extrabold">{role === "driver" ? t("Complétez votre profil transporteur") : t("Complétez votre profil client")}</h1>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Prénom")}><input name="first" required defaultValue={init.first} className="input" /></Field>
          <Field label={t("Nom")}><input name="last" required defaultValue={init.last} className="input" /></Field>
        </div>
        <Field label={t("Numéro de téléphone")}><input name="phone" type="tel" required dir="ltr" placeholder="0555 12 34 56" className="input text-start" /></Field>
        <BirthDateField />
        <label className="flex items-start gap-2 text-sm">
          <input name="terms" type="checkbox" className="mt-1 h-4 w-4 accent-pink-600" />
          <span>{t("J'accepte les")} <a href="/conditions" target="_blank" className="font-bold text-brand-pink underline">{t("conditions d'utilisation")}</a>.</span>
        </label>
        {err && <Alert>{err}</Alert>}
        <button disabled={busy} className="btn btn-primary w-full">{busy ? "…" : t("Continuer")}</button>
      </form>
    </div>
  );
}
