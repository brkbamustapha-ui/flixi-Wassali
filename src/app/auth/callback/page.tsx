"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Spinner } from "@/components/ui";

export default function Callback() {
  const router = useRouter();
  useEffect(() => {
    const sb = supabase();
    let done = false;
    let recovery = false;
    async function route() {
      if (done) return;
      const { data: { session } } = await sb.auth.getSession();
      if (!session) return;
      done = true;
      const { data: p } = await sb.from("flixi_profiles").select("role").eq("id", session.user.id).maybeSingle();
      router.replace(p ? `/${p.role}` : "/onboarding");
    }
    const { data: sub } = sb.auth.onAuthStateChange((event: string) => {
      if (event === "PASSWORD_RECOVERY") { recovery = true; done = true; router.replace("/auth/reset"); return; }
      // laisse le temps à l'évènement de récupération d'arriver après la connexion
      setTimeout(() => { if (!recovery) route(); }, 800);
    });
    setTimeout(() => { if (!recovery) route(); }, 800);
    const t = setTimeout(() => { if (!done) router.replace("/"); }, 8000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, [router]);
  return <div className="grad-soft min-h-screen pt-32"><Spinner /></div>;
}
