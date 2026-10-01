"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LAST_ROLE_KEY, ensureSession, supabase } from "./supabase";

/**
 * Si l'utilisateur est déjà connecté, l'envoie directement sur son espace (dernier compte ouvert),
 * sans passer par l'accueil ni la page de connexion. Renvoie `true` tant que la vérification est en cours.
 */
export function useAutoEnter() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const session = await ensureSession();
      if (!alive) return;
      if (!session) return setChecking(false);

      let role: string | null = null;
      const { data, error } = await supabase().from("flixi_profiles").select("role").eq("id", session.user.id).maybeSingle();
      if (!alive) return;
      if (!error && !data) return router.replace("/onboarding");
      role = data?.role ?? null;
      if (!role) { try { role = localStorage.getItem(LAST_ROLE_KEY); } catch {} } // réseau indisponible : dernier compte connu
      if (role === "client" || role === "driver") router.replace(`/${role}`);
      else setChecking(false);
    })();
    return () => { alive = false; };
  }, [router]);

  return checking;
}
