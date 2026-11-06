"use server";
import { revalidatePath } from "next/cache";
import { adminRpc } from "@/lib/admin";

/** Valider (l'autre partie devra ensuite accepter) ou refuser une demande d'annulation de course. */
export async function decideCancel(id: string, approve: boolean, note: string): Promise<{ ok: boolean; error?: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "Commande invalide." };
  try {
    await adminRpc("flixi_admin_cancel_decide", { p_order: id, p_approve: approve, p_note: note.trim() });
  } catch (e) {
    return { ok: false, error: (e as Error).message === "unauthorized" ? "Session expirée : reconnectez-vous." : `Erreur : ${(e as Error).message}` };
  }
  revalidatePath("/admin/cancellations");
  return { ok: true };
}
