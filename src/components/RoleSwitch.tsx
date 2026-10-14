"use client";
import { useState } from "react";
import { useSession } from "@/components/Session";
import { Alert } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import { INTRO_SESSION_KEY } from "@/lib/intro";

/** Bascule client ↔ transporteur avec le même compte, sans se déconnecter. */
export default function RoleSwitch({ to, compact }: { to: "client" | "driver"; compact?: boolean }) {
  const { sb } = useSession();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function go() {
    setBusy(true); setErr("");
    const { data, error } = await sb.rpc("flixi_switch_role", { p_role: to });
    if (error) { setBusy(false); return setErr(error.message === "course en cours" ? t("Impossible de changer de profil : une course est en cours.") : t(error.message)); }
    const r = data as { has_driver_file: boolean };
    try { sessionStorage.setItem(INTRO_SESSION_KEY, "1"); } catch {} // pas d'animation ni de son lors d'une bascule
    window.location.href = to === "client" ? "/client" : r.has_driver_file ? "/driver" : "/driver/apply";
  }
  if (compact) {
    return (
      <button onClick={go} disabled={busy} title={err || undefined} aria-label={to === "driver" ? t("Basculer vers transporteur") : t("Basculer vers client")} className="btn btn-primary !px-2.5 !py-1.5 text-sm sm:!px-3">
        {to === "driver" ? "🚚" : "📦"}<span className="hidden sm:inline"> {to === "driver" ? t("Basculer vers transporteur") : t("Basculer vers client")}</span>
      </button>
    );
  }
  return (
    <div className="card space-y-2 p-6">
      <p className="font-extrabold">🔁 {to === "driver" ? t("Devenir transporteur avec ce compte") : t("Passer en mode client")}</p>
      <p className="text-xs text-slate-500">{to === "driver" ? t("Même email, sans vous déconnecter. Si vous n'avez pas encore de dossier transporteur, vous le remplirez à l'étape suivante.") : t("Même email, sans vous déconnecter. Vous pourrez revenir en mode transporteur à tout moment.")}</p>
      {err && <Alert>{err}</Alert>}
      <button onClick={go} disabled={busy} className="btn btn-ghost w-full">{to === "driver" ? "🚚 " + t("Basculer vers transporteur") : "📦 " + t("Basculer vers client")}</button>
    </div>
  );
}
