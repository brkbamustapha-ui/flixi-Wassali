"use server";
import { revalidatePath } from "next/cache";
import { adminRpc } from "@/lib/admin";

/** Lever ou maintenir un bannissement. */
export async function decideBan(id: string, lift: boolean, note: string): Promise<{ ok: boolean; error?: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, error: "Bannissement invalide." };
  try {
    await adminRpc("flixi_admin_ban_decide", { p_ban: id, p_lift: lift, p_note: note.trim() });
  } catch (e) {
    return { ok: false, error: (e as Error).message === "unauthorized" ? "Session expirée : reconnectez-vous." : `Erreur : ${(e as Error).message}` };
  }
  revalidatePath("/admin/bans");
  return { ok: true };
}
