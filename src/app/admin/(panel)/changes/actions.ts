"use server";
import { revalidatePath } from "next/cache";
import { adminRpc } from "@/lib/admin";

/** Accepter / refuser une demande de modification de compte transporteur. */
export async function decideChange(id: string, approve: boolean, note: string): Promise<{ ok: boolean; error?: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "Demande invalide." };
  try {
    await adminRpc("flixi_admin_decide_change", { p_id: id, p_approve: approve, p_note: note.trim() });
  } catch (e) {
    return { ok: false, error: (e as Error).message === "unauthorized" ? "Session expirée : reconnectez-vous." : `Erreur : ${(e as Error).message}` };
  }
  revalidatePath("/admin/changes");
  return { ok: true };
}
