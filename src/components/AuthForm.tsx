"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { validPhoneDZ } from "@/lib/format";
import { Alert, Field } from "./ui";
import { Logo } from "./Logo";

export function GoogleButton({ role }: { role: "client" | "driver" }) {
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    localStorage.setItem("flixi_role", role);
    await supabase().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback` } });
  }
  return (
    <button type="button" onClick={go} disabled={busy} className="btn btn-ghost w-full">
      <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/></svg>
      Continuer avec Google
    </button>
  );
}

export default function AuthForm({ role }: { role: "client" | "driver" }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const isDriver = role === "driver";

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(""); setInfo("");
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")).trim();
    const password = String(f.get("password"));
    const sb = supabase();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw new Error("Email ou mot de passe incorrect.");
        return router.replace(`/${role}`);
      }
      const first = String(f.get("first_name")).trim(), last = String(f.get("last_name")).trim(), phone = String(f.get("phone")).trim();
      if (!validPhoneDZ(phone)) throw new Error("Numéro de téléphone algérien invalide (ex : 0555 12 34 56).");
      if (password.length < 6) throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
      if (!f.get("terms")) throw new Error("Vous devez accepter les conditions d'utilisation.");
      const { data, error } = await sb.auth.signUp({
        email, password,
        options: { data: { flixi_role: role, first_name: first, last_name: last, phone }, emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) throw new Error(error.message.includes("registered") ? "Cet email a déjà un compte. Connectez-vous." : error.message);
      if (data.session) return router.replace(`/${role}`);
      setInfo("Compte créé ! Vérifiez votre boîte email pour confirmer votre adresse, puis connectez-vous.");
      setMode("login");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grad-soft flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-6 flex justify-center"><Logo size={46} /></Link>
        <div className="card p-6 sm:p-8">
          <div className={`mb-5 rounded-2xl p-4 text-white ${isDriver ? "bg-gradient-to-r from-violet-600 to-fuchsia-500" : "grad-bg"}`}>
            <p className="text-xs font-bold uppercase tracking-widest opacity-90">{isDriver ? "Espace transporteur" : "Espace client"}</p>
            <p className="text-lg font-extrabold">{isDriver ? "Transportez et gagnez, partout en Algérie 🚚" : "Expédiez vos marchandises partout en Algérie 📦"}</p>
          </div>
          <div className="mb-5 grid grid-cols-2 rounded-xl bg-violet-50 p-1 text-sm font-bold">
            {(["signup", "login"] as const).map((m) => (
              <button key={m} type="button" onClick={() => { setMode(m); setErr(""); }}
                className={`rounded-lg py-2 transition ${mode === m ? "bg-white shadow text-brand-pink" : "text-slate-500"}`}>
                {m === "signup" ? "Créer un compte" : "Se connecter"}
              </button>
            ))}
          </div>
          <div className="space-y-4">
            <GoogleButton role={role} />
            <div className="flex items-center gap-3 text-xs font-bold text-slate-400"><span className="h-px flex-1 bg-slate-200" />OU<span className="h-px flex-1 bg-slate-200" /></div>
            <form onSubmit={submit} className="space-y-3.5">
              {mode === "signup" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Prénom"><input name="first_name" required className="input" autoComplete="given-name" /></Field>
                    <Field label="Nom"><input name="last_name" required className="input" autoComplete="family-name" /></Field>
                  </div>
                  <Field label="Numéro de téléphone"><input name="phone" required type="tel" placeholder="0555 12 34 56" className="input" autoComplete="tel" /></Field>
                </>
              )}
              <Field label="Email"><input name="email" required type="email" className="input" autoComplete="email" /></Field>
              <Field label="Mot de passe"><input name="password" required type="password" minLength={6} className="input" autoComplete={mode === "login" ? "current-password" : "new-password"} /></Field>
              {mode === "signup" && (
                <label className="flex items-start gap-2 text-sm">
                  <input name="terms" type="checkbox" className="mt-1 h-4 w-4 accent-pink-600" />
                  <span>J'accepte les <Link href="/conditions" target="_blank" className="font-bold text-brand-pink underline">conditions d'utilisation</Link>.</span>
                </label>
              )}
              {err && <Alert>{err}</Alert>}
              {info && <Alert kind="ok">{info}</Alert>}
              <button disabled={busy} className="btn btn-primary w-full">{busy ? "Veuillez patienter…" : mode === "signup" ? (isDriver ? "Continuer vers mon dossier" : "Créer mon compte") : "Connexion"}</button>
            </form>
          </div>
        </div>
        <p className="mt-5 text-center text-sm text-slate-500">
          {isDriver ? "Vous voulez expédier ?" : "Vous êtes transporteur ?"}{" "}
          <Link href={isDriver ? "/client/login" : "/driver/login"} className="font-bold text-brand-pink">{isDriver ? "Espace client" : "Espace transporteur"}</Link>
        </p>
      </div>
    </div>
  );
}
