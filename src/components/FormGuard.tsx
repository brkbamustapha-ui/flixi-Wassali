"use client";
import { useEffect } from "react";

/** Sur TOUS les formulaires : quand une case obligatoire est vide, la page revient sur cette case, l'entoure en rouge et y place le curseur. */
export default function FormGuard() {
  useEffect(() => {
    let busy = false;
    const onInvalid = (e: Event) => {
      if (busy) return; // un seul repère par tentative de validation (la première case manquante)
      busy = true; window.setTimeout(() => { busy = false; }, 700);
      const el = e.target as HTMLElement;
      const holder = el.closest<HTMLElement>("[data-field]") ?? el.closest<HTMLElement>("label") ?? el.parentElement ?? el;
      holder.scrollIntoView({ behavior: "smooth", block: "center" });
      holder.classList.remove("field-error"); void holder.offsetWidth; holder.classList.add("field-error");
      window.setTimeout(() => holder.classList.remove("field-error"), 3500);
      window.setTimeout(() => { try { el.focus({ preventScroll: true }); } catch {} }, 450);
    };
    document.addEventListener("invalid", onInvalid, true);
    return () => document.removeEventListener("invalid", onInvalid, true);
  }, []);
  return null;
}
