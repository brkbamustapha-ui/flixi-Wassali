"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Logo } from "@/components/Logo";
import { Alert } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

export const TERMS_VERSION = 1;

/** Première connexion d'un transporteur : accepter les conditions (une seule fois, relisibles à tout moment). */
export function TermsGate({ sb, onDone, onLogout }: { sb: SupabaseClient; onDone: () => void; onLogout: () => void }) {
  const { t } = useI18n();
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function accept() {
    setBusy(true); setErr("");
    const { error } = await sb.rpc("flixi_accept_terms", { p_version: TERMS_VERSION });
    setBusy(false);
    if (error) return setErr(error.message);
    onDone();
  }
  return (
    <div className="grad-soft flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-md space-y-4 p-6 sm:p-8">
        <div className="flex justify-center"><Logo size={42} /></div>
        <h1 className="text-center text-xl font-extrabold">{t("Conditions d'utilisation")}</h1>
        <p className="text-sm text-slate-600">{t("Avant de continuer, lisez et acceptez les conditions : commission de 8 à 12 %, localisation obligatoire, règles d'annulation (3 annulations en 1 semaine = bannissement d'une semaine), responsabilité de la marchandise.")}</p>
        <Link href="/conditions" target="_blank" className="btn btn-ghost w-full text-sm">📄 {t("Lire les conditions")}</Link>
        <label className="flex items-start gap-2 text-sm font-bold"><input type="checkbox" className="mt-1 h-4 w-4 accent-pink-600" checked={ok} onChange={(e) => setOk(e.target.checked)} /><span>{t("J'ai lu et j'accepte les conditions d'utilisation.")}</span></label>
        {err && <Alert>{err}</Alert>}
        <button disabled={!ok || busy} onClick={accept} className="btn btn-primary w-full">{busy ? "…" : t("Accepter et continuer")}</button>
        <button onClick={onLogout} className="w-full text-center text-sm font-bold text-slate-500">{t("Quitter")}</button>
      </div>
    </div>
  );
}

/** Localisation obligatoire : elle doit rester activée en permanence (le serveur refuse les offres sinon). Bloque l'application si elle est coupée. */
export function LocationGuard({ sb, children }: { sb: SupabaseClient; children: React.ReactNode }) {
  const { t } = useI18n();
  const [state, setState] = useState<"checking" | "ok" | "denied" | "unsupported">("checking");
  const last = useRef(0);

  useEffect(() => {
    if (!navigator.geolocation) return setState("unsupported");
    let dead = false;
    const push = (lat: number, lng: number) => {
      if (Date.now() - last.current < 20000) return;
      last.current = Date.now();
      sb.rpc("flixi_driver_ping_loc", { p_lat: lat, p_lng: lng });
    };
    const ok = (p: GeolocationPosition) => { if (dead) return; setState("ok"); push(p.coords.latitude, p.coords.longitude); };
    const ko = (e: GeolocationPositionError) => { if (!dead && e.code === 1) setState("denied"); };
    const id = navigator.geolocation.watchPosition(ok, ko, { enableHighAccuracy: true, maximumAge: 15000, timeout: 30000 });
    const tick = setInterval(() => navigator.geolocation.getCurrentPosition(ok, ko, { maximumAge: 30000, timeout: 20000 }), 45000);
    return () => { dead = true; navigator.geolocation.clearWatch(id); clearInterval(tick); };
  }, [sb]);

  if (state === "ok" || state === "checking") return <>{children}</>;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-white/95 px-6 text-center backdrop-blur">
      <div className="card max-w-sm space-y-4 p-6">
        <div className="text-5xl">📍</div>
        <h2 className="text-xl font-extrabold">{t("Activez la localisation")}</h2>
        <p className="text-sm text-slate-600">{state === "unsupported" ? t("Votre appareil ne permet pas la géolocalisation : elle est obligatoire pour les transporteurs.") : t("La localisation est obligatoire pour suivre la marchandise. Activez-la dans les réglages de votre navigateur puis réessayez : sans elle, vous ne pouvez ni enchérir ni accepter une commande.")}</p>
        <button onClick={() => { setState("checking"); navigator.geolocation?.getCurrentPosition(() => setState("ok"), (e) => e.code === 1 && setState("denied"), { enableHighAccuracy: true, timeout: 20000 }); }} className="btn btn-primary w-full">{t("Réessayer")}</button>
      </div>
    </div>
  );
}

/** Écran de bannissement : règle, durée, demande de levée du ban. */
export function BanScreen({ sb, onLogout }: { sb: SupabaseClient; onLogout: () => void }) {
  const { t, dateTime } = useI18n();
  const [ban, setBan] = useState<{ reason: string; until: string; appeal: string | null; appeal_at: string | null; decision_note: string | null } | null | undefined>(undefined);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => sb.rpc("flixi_my_ban").then(({ data }) => setBan((data as typeof ban) ?? null));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  async function send() {
    setBusy(true); setErr("");
    const { error } = await sb.rpc("flixi_ban_appeal", { p_text: text });
    setBusy(false);
    if (error) return setErr(t(error.message));
    load();
  }
  return (
    <div className="grad-soft flex min-h-screen items-center justify-center px-4 py-10">
      <div className="card w-full max-w-md space-y-4 p-6 sm:p-8">
        <div className="text-center text-5xl">⛔</div>
        <h1 className="text-center text-xl font-extrabold">{t("Compte banni")}</h1>
        {ban === undefined ? null : ban ? (
          <>
            <Alert>{t("Motif : {r}", { r: ban.reason })} — {t("jusqu'au {d}", { d: dateTime(ban.until) })}</Alert>
            <p className="text-sm text-slate-600">{t("Règle : un transporteur qui annule 3 courses en moins d'une semaine est banni pendant 1 semaine. Votre adresse IP est associée à ce bannissement.")}</p>
            {ban.decision_note && <Alert kind="info">{t("Réponse de l'équipe : {n}", { n: ban.decision_note })}</Alert>}
            {ban.appeal ? (
              <Alert kind="ok">{t("Votre demande de levée du bannissement est en cours d'examen : l'équipe décidera de le lever ou de le maintenir.")}</Alert>
            ) : (
              <div className="space-y-2">
                <p className="text-sm font-bold">{t("Demander la levée du bannissement")}</p>
                <textarea className="textarea" rows={3} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder={t("Expliquez votre situation…")} />
                {err && <Alert>{err}</Alert>}
                <button disabled={busy || text.trim().length < 10} onClick={send} className="btn btn-primary w-full">{t("Envoyer la demande")}</button>
              </div>
            )}
          </>
        ) : <Alert>{t("Votre compte est suspendu. Contactez le support Flixi Wassali.")}</Alert>}
        <button onClick={onLogout} className="w-full text-center text-sm font-bold text-slate-500">{t("Quitter")}</button>
      </div>
    </div>
  );
}
