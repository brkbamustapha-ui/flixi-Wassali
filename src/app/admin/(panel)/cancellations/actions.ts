"use server";
import { revalidatePath } from "next/cache";
import { adminRpc } from "@/lib/admin";

/** Trancher un litige d'annulation : annuler la course (avec ou sans frais) ou la laisser continuer. */
export async function resolveCancel(id: string, approve: boolean, withFee: boolean, note: string): Promise<{ ok: boolean; error?: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "Commande invalide." };
  try {
    await adminRpc("flixi_admin_cancel_resolve", { p_order: id, p_approve: approve, p_with_fee: withFee, p_note: note.trim() });
  } catch (e) {
    return { ok: false, error: (e as Error).message === "unauthorized" ? "Session expirée : reconnectez-vous." : `Erreur : ${(e as Error).message}` };
  }
  revalidatePath("/admin/cancellations");
  return { ok: true };
}
