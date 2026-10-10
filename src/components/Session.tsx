"use client";
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase, ensureSession, LAST_ROLE_KEY, Profile, DriverFile } from "@/lib/supabase";
import { Logo } from "./Logo";
import { Alert, Spinner } from "./ui";
import { useI18n } from "@/lib/i18n";
import LangSwitch from "./LangSwitch";
import EventsHost from "./EventsHost";
import NotifBell from "./NotifBell";
import { TermsGate, LocationGuard, BanScreen, TERMS_VERSION } from "./DriverGate";
import BirthDateField, { isAdult, readBirth } from "./BirthDateField";

type Ctx = { sb: SupabaseClient; profile: Profile; driver: DriverFile | null; refresh: () => Promise<void> };
const SessionCtx = createContext<Ctx | null>(null);
export const useSession = () => useContext(SessionCtx)!;

export type NavItem = { href: string; label: string; icon: string };

export function AppGuard({ role, nav, children }: { role: "client" | "driver"; nav: NavItem[]; children: ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const sb = supabase();
  const { t } = useI18n();
  const [state, setState] = useState<{ profile: Profile; driver: DriverFile | null } | null>(null);

  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    // Session lue en local : on ne déconnecte jamais sur une simple erreur réseau.
    const session = await ensureSession();
    if (!session) return router.replace(`/${role}/login`);
    let res = await sb.from("flixi_profiles").select("*").eq("id", session.user.id).maybeSingle();
    if (res.error && (res.error.code === "PGRST301" || /jwt/i.test(res.error.message))) {
      const r = await sb.auth.refreshSession();
      if (r.error && /invalid|expired|not found|already used/i.test(r.error.message)) return router.replace(`/${role}/login`);
      res = await sb.from("flixi_profiles").select("*").eq("id", session.user.id).maybeSingle();
    }
    if (res.error) return setFailed(true); // réseau instable : on propose de réessayer
    const profile = res.data;
    if (!profile) {
      localStorage.setItem("flixi_role", role);
      return router.replace("/onboarding");
    }
    if (profile.role !== role) return router.replace(`/${profile.role}`);
    try { localStorage.setItem(LAST_ROLE_KEY, profile.role); } catch {}
    let driver: DriverFile | null = null;
    if (role === "driver") {
      const d = await sb.from("flixi_drivers").select("*").eq("user_id", session.user.id).maybeSingle();
      if (d.error) return setFailed(true);
      driver = d.data;
      if (!driver && path !== "/driver/apply") return router.replace("/driver/apply");
    }
    setState({ profile, driver });
  }, [sb, router, role, path]);

  useEffect(() => { load(); }, [load]);

  if (failed && !state) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-5xl">📡</div>
        <p className="font-extrabold">{t("Connexion au serveur impossible pour le moment.")}</p>
        <p className="text-sm text-slate-500">{t("Vous restez connecté. Vérifiez votre connexion internet puis réessayez.")}</p>
        <button onClick={load} className="btn btn-primary w-full">{t("Réessayer")}</button>
      </div>
    );
  }
  if (!state) return <Spinner />;
  const { profile, driver } = state;

  async function logout() {
    await sb.auth.signOut();
    router.replace("/");
  }

  // Anciens comptes : la date de naissance est obligatoire (19 ans minimum).
  if (!profile.birth_date) return <BirthGate onSaved={load} onLogout={logout} />;
  // Compte banni (3 annulations en 1 semaine, etc.) : écran dédié avec demande de levée
  if (profile.status === "suspended" && profile.banned_until) return <BanScreen sb={sb} onLogout={logout} />;
  // Transporteur : conditions à accepter une seule fois
  if (role === "driver" && driver && (profile.terms_version ?? 0) < TERMS_VERSION) return <TermsGate sb={sb} onDone={load} onLogout={logout} />;

  return (
    <SessionCtx.Provider value={{ sb, profile, driver, refresh: load }}>
     <GuardWrap on={role === "driver" && !!driver && path !== "/driver/apply"} sb={sb} userId={profile.id}>
      <div className="min-h-screen pb-24 md:pb-10">
        <header className="sticky top-0 z-30 border-b border-violet-100 bg-white/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <Link href={`/${role}`}><Logo size={36} /></Link>
            <nav className="hidden gap-1 md:flex">
              {nav.map((n) => {
                const active = n.href === `/${role}` ? path === n.href : path.startsWith(n.href);
                return (
                  <Link key={n.href} href={n.href}
                    className={`rounded-xl px-3.5 py-2 text-sm font-bold transition ${active ? "grad-bg text-white shadow" : "text-slate-600 hover:bg-violet-50"}`}>
                    {t(n.label)}
                  </Link>
                );
              })}
            </nav>
            <div className="flex items-center gap-3">
              <span className="hidden text-sm font-bold sm:block">{profile.first_name}</span>
              <NotifBell sb={sb} role={role} />
              <LangSwitch />
              <button onClick={logout} className="btn btn-ghost !px-3 !py-1.5 text-sm">{t("Quitter")}</button>
            </div>
          </div>
        </header>
        {profile.status === "suspended" && (
          <div className="bg-rose-600 px-4 py-2 text-center text-sm font-bold text-white">{t("Votre compte est suspendu. Contactez le support Flixi Wassali.")}</div>
        )}
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
        <EventsHost sb={sb} role={role} />
        <nav className="fixed inset-x-0 bottom-0 z-30 grid border-t border-violet-100 bg-white/95 backdrop-blur md:hidden" style={{ gridTemplateColumns: `repeat(${nav.length}, 1fr)` }}>
          {nav.map((n) => {
            const active = n.href === `/${role}` ? path === n.href : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold ${active ? "text-brand-pink" : "text-slate-500"}`}>
                <span className="text-xl leading-none">{n.icon}</span>{t(n.label)}
              </Link>
            );
          })}
        </nav>
      </div>
     </GuardWrap>
    </SessionCtx.Provider>
  );
}

/** Localisation obligatoire pour les transporteurs (hors formulaire d'inscription du dossier). */
function GuardWrap({ on, sb, userId, children }: { on: boolean; sb: SupabaseClient; userId: string; children: ReactNode }) {
  return on ? <LocationGuard sb={sb} userId={userId}>{children}</LocationGuard> : <>{children}</>;
}

/** Écran bloquant pour les comptes créés avant l'ajout de la date de naissance. */
function BirthGate({ onSaved, onLogout }: { onSaved: () => Promise<void>; onLogout: () => Promise<void> }) {
  const { t } = useI18n();
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [denied, setDenied] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const birth = readBirth(new FormData(e.currentTarget));
    if (!birth) return setErr(t("Date de naissance invalide."));
    setBusy(true); setErr("");
    if (!isAdult(birth)) {
      await supabase().rpc("flixi_set_birth", { p_birth: birth });
      setBusy(false);
      return setDenied(true);
    }
    const { error } = await supabase().rpc("flixi_set_birth", { p_birth: birth });
    if (error) { setBusy(false); return setErr(error.message); }
    await onSaved();
  }

  return (
    <div className="grad-soft flex min-h-screen items-center justify-center px-4 py-10">
      <form onSubmit={submit} className="card w-full max-w-md space-y-4 p-6 sm:p-8">
        <div className="flex justify-center"><Logo size={42} /></div>
        {denied ? (
          <>
            <Alert>{t("Vous devez avoir au moins 19 ans pour utiliser Flixi Wassali. Votre accès est refusé.")}</Alert>
            <button type="button" onClick={onLogout} className="btn btn-ghost w-full">{t("Quitter")}</button>
          </>
        ) : (
          <>
            <h1 className="text-center text-xl font-extrabold">{t("Une dernière information")}</h1>
            <p className="text-center text-sm text-slate-600">{t("Pour continuer, indiquez votre date de naissance. Flixi Wassali est réservé aux personnes de 19 ans et plus.")}</p>
            <BirthDateField />
            {err && <Alert>{err}</Alert>}
            <button disabled={busy} className="btn btn-primary w-full">{busy ? "…" : t("Continuer")}</button>
            <button type="button" onClick={onLogout} className="w-full text-center text-sm font-bold text-slate-500">{t("Quitter")}</button>
          </>
        )}
      </form>
    </div>
  );
}
