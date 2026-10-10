import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { secretRpc } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** Envoie le code de confirmation d'un numéro (SMS) ou d'un e-mail ajouté par l'utilisateur.
 *  Fournisseurs : Twilio (SMS) et Resend (e-mail), configurés par variables d'environnement. Sans eux, rien n'est envoyé (sent:false). */
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || token.length > 4000) return NextResponse.json({ sent: false, error: "auth" }, { status: 401 });
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ sent: false, error: "auth" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { id?: string };
  if (!body.id || !/^[0-9a-f-]{36}$/i.test(body.id)) return NextResponse.json({ sent: false, error: "id" }, { status: 400 });

  let c: { kind: "phone" | "email"; value: string; code: string } | null = null;
  try { c = await secretRpc("flixi_admin_contact_code", { p_user: data.user.id, p_id: body.id }); } catch { return NextResponse.json({ sent: false, error: "server" }, { status: 500 }); }
  if (!c) return NextResponse.json({ sent: false, error: "none" }, { status: 404 });

  const msg = `Flixi Wassali : votre code de confirmation est ${c.code} (valable 15 minutes).`;
  try {
    if (c.kind === "email" && process.env.RESEND_API_KEY) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: process.env.EMAIL_FROM ?? "Flixi Wassali <onboarding@resend.dev>", to: [c.value], subject: "Code de confirmation Flixi Wassali", text: msg }),
      });
      return NextResponse.json({ sent: r.ok, channel: "email" });
    }
    if (c.kind === "phone" && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM) {
      const digits = c.value.replace(/[^\d+]/g, "");
      const to = digits.startsWith("+") ? digits : digits.startsWith("00") ? `+${digits.slice(2)}` : `+213${digits.replace(/^0/, "")}`;
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: "POST",
        headers: { Authorization: `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ To: to, From: process.env.TWILIO_FROM, Body: msg }),
      });
      return NextResponse.json({ sent: r.ok, channel: "sms" });
    }
  } catch { return NextResponse.json({ sent: false, error: "provider" }, { status: 502 }); }
  return NextResponse.json({ sent: false, error: "not_configured" });
}
