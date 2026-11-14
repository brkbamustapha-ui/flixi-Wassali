"use client";
import { useEffect, useRef } from "react";

/** Recharge les données d'une page toutes les `ms` millisecondes (onglet visible), au retour sur l'onglet, et dès qu'un événement « flixi:refresh » est émis
 *  (nouvelle notification) : l'évolution d'une course s'affiche sans actualiser la page. */
export function useAutoRefresh(load: () => void | Promise<unknown>, ms = 5000) {
  const ref = useRef(load);
  ref.current = load;
  useEffect(() => {
    const run = () => { if (document.visibilityState === "visible") void ref.current(); };
    const i = window.setInterval(run, ms);
    window.addEventListener("flixi:refresh", run);
    document.addEventListener("visibilitychange", run);
    window.addEventListener("focus", run);
    return () => { window.clearInterval(i); window.removeEventListener("flixi:refresh", run); document.removeEventListener("visibilitychange", run); window.removeEventListener("focus", run); };
  }, [ms]);
}
