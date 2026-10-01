import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clientIp, secretRpc } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** Enregistre l'adresse IP d'un utilisateur connecté (sécurité / traçabilité), visible dans le tableau de bord admin. */
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || token.length > 4000) return NextResponse.json({ ok: false }, { status: 401 });
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.getUser(token); // le jeton est vérifié auprès de Supabase
  if (error || !data.user) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    await secretRpc("flixi_track_ip", { p_user: data.user.id, p_ip: await clientIp(), p_ua: req.headers.get("user-agent") ?? "" });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
