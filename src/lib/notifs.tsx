"use client";
import { useCallback } from "react";
import { da } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export type Notif = {
  id: string; kind: string; read?: boolean; created_at?: string;
  params: { from?: string; to?: string; price?: number; by?: string; count?: number; accepted?: boolean; order?: string; ref?: string; text?: string; stars?: number; approved?: boolean };
};

/** Texte lisible d'une notification + lien vers la page concernée. */
export function useNotifText(role: "client" | "driver") {
  const { t, w } = useI18n();
  const text = useCallback((n: Notif) => {
    const r = n.params.from && n.params.to ? `${w(n.params.from)} → ${w(n.params.to)}` : n.params.ref ?? "";
    switch (n.kind) {
      case "new_bid": return t("Nouvelle offre de {p} sur votre commande {r}", { p: da(n.params.price), r });
      case "new_trip_bid": return t("Nouvelle offre de {p} sur votre trajet {r}", { p: da(n.params.price), r });
      case "deal": return t("Affaire conclue {r} pour {p}", { p: da(n.params.price), r });
      case "cancel_request": return t("Demande d'annulation reçue pour {r}", { r });
      case "cancel_answer": return n.params.accepted ? t("Votre demande d'annulation a été acceptée ({r})", { r }) : t("Votre demande d'annulation a été refusée ({r})", { r });
      case "cancelled": return t("Course annulée par {who} ({r})", { who: n.params.by === "driver" ? t("le transporteur") : t("le client"), r });
      case "warning": return t("Avertissement {n}/2 : au bout de 2 avertissements votre compte est banni.", { n: n.params.count ?? 1 });
      case "message": return t("Nouveau message ({r}) : {m}", { r: n.params.ref ?? "", m: n.params.text ?? "" });
      case "in_transit": return t("Votre marchandise est en route ({r})", { r });
      case "delivered": return t("Course terminée ({r}) — pensez à noter l'autre partie", { r });
      case "rating": return t("Vous avez reçu une note de {n}/5 ({r})", { n: n.params.stars ?? 0, r: n.params.ref ?? "" });
      case "ban_lifted": return t("Votre bannissement a été levé par l'équipe.");
      case "change_decision": return n.params.approved ? t("Votre demande de modification a été acceptée.") : t("Votre demande de modification a été refusée.");
      default: return t("Nouvelle notification");
    }
  }, [t, w]);
  const href = useCallback((n: Notif): string | undefined => {
    const o = n.params.order;
    if (o) return `/${role}/orders/${o}`;
    if (n.kind === "new_trip_bid") return "/driver/trips";
    if (n.kind === "change_decision") return `/${role}/account`;
    return undefined;
  }, [role]);
  return { text, href };
}
