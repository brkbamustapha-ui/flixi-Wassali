"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Rafraîchit la page admin toutes les 8 s : les nouvelles demandes apparaissent sans actualiser. */
export default function AutoRefresh({ ms = 8000 }: { ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    const i = window.setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, ms);
    return () => window.clearInterval(i);
  }, [router, ms]);
  return null;
}
