"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Alert, Field, Spinner } from "@/components/ui";
import { Logo } from "@/components/Logo";
import LangSwitch from "@/components/LangSwitch";
import { useI18n } from "@/lib/i18n";

/** Étape 2 : choix du nouveau mot de passe (après avoir cliqué le lien reçu par email) */
export default function ResetPassword() {
  const router = useRouter();
  const { t } = useI18n();
  const [state, setState] = useState<"loading" | "ready" | "invalid" | "done">("loading");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    supabase().auth.getSession().then(({ data }: { data: { session: unknown } }) => setState(data.session ? "ready" : "invalid"));
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    const pw = String(f.get("password")), pw2 = String(f.get("password2"));
    if (pw.length < 6) return setErr(t("Le mot de passe doit contenir au moins 6 caractères."));
    if (pw !== pw2) return setErr(t("Les deux mots de passe ne sont pas identiques."));
    setErr(""); setBusy(true);
    const sb = supabase();
    const { error } = await sb.auth.updateUser({ password: pw });
    if (error) {
      setBusy(false);
      return setErr(/same|different/i.test(error.message) ? t("Choisissez un mot de passe différent de l'ancien.") : error.message);
    }
    setState("done");
    const { data: { user } } = await sb.auth.getUser();
    const { data: p } = user ? await sb.from("flixi_profiles").select("role").eq("id", user.id).maybeSingle() : { data: null };
    setTimeout(() => router.replace(p ? `/${p.role}` : "/"), 1800);
  }

  return (
    <div className="grad-soft flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-2 flex justify-end"><LangSwitch /></div>
        <Link href="/" className="mb-6 flex justify-center"><Logo size={46} /></Link>
        <div className="card space-y-4 p-6 sm:p-8">
          {state === "loading" && <Spinner />}
          {state === "invalid" && (
            <>
              <Alert>{t("Ce lien est invalide ou a expiré. Demandez un nouveau lien de réinitialisation.")}</Alert>
              <Link href="/client/login" className="btn btn-primary w-full">{t("Retour à la connexion")}</Link>
            </>
          )}
          {state === "done" && <Alert kind="ok">✔ {t("Mot de passe modifié. Redirection…")}</Alert>}
          {state === "ready" && (
            <form onSubmit={submit} className="space-y-4">
              <h1 className="text-xl font-extrabold">{t("Nouveau mot de passe")}</h1>
              <Field label={t("Nouveau mot de passe")}>
                <div className="relative">
                  <input name="password" required type={showPw ? "text" : "password"} minLength={6} dir="ltr" className="input text-start !pe-12" autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={t("Afficher le mot de passe")} className="absolute inset-y-0 end-3 text-lg">{showPw ? "🙈" : "👁"}</button>
                </div>
              </Field>
              <Field label={t("Confirmer le mot de passe")}><input name="password2" required type={showPw ? "text" : "password"} minLength={6} dir="ltr" className="input text-start" autoComplete="new-password" /></Field>
              {err && <Alert>{err}</Alert>}
              <button disabled={busy} className="btn btn-primary w-full">{busy ? t("Veuillez patienter…") : t("Enregistrer le nouveau mot de passe")}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
