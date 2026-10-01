"use server";
import { revalidatePath } from "next/cache";
import { adminRpc } from "@/lib/admin";

const APPROVALS = ["approved", "rejected", "pending"];

/** Décision sur un dossier transporteur (appelée depuis le formulaire de décision). */
export async function decideDriver(id: string, approval: string, note: string): Promise<{ ok: boolean; error?: string }> {
  if (!APPROVALS.includes(approval)) return { ok: false, error: "Décision invalide." };
  try {
    await adminRpc("flixi_admin_set_approval", { p_id: id, p_approval: approval, p_note: note.trim() || null });
  } catch (e) {
    return { ok: false, error: (e as Error).message === "unauthorized" ? "Session expirée : reconnectez-vous." : `Erreur : ${(e as Error).message}` };
  }
  revalidatePath(`/admin/drivers/${id}`);
  revalidatePath("/admin/drivers");
  revalidatePath("/admin");
  return { ok: true };
}
