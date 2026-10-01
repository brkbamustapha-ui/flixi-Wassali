import "server-only";
import { createHmac, timingSafeEqual, createHash } from "crypto";
import { cookies, headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const COOKIE = "flixi_admin";
const TTL = 60 * 60 * 8; // 8 h

const secret = () => process.env.ADMIN_SESSION_SECRET ?? "";
const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

const digest = (s: string) => createHash("sha256").update(s).digest();
export function checkCredentials(user: string, pass: string) {
  const okUser = timingSafeEqual(digest(user), digest(process.env.ADMIN_USERNAME ?? "\0"));
  const okPass = timingSafeEqual(digest(pass), digest(process.env.ADMIN_PASSWORD ?? "\0"));
  return okUser && okPass && !!process.env.ADMIN_USERNAME && !!process.env.ADMIN_PASSWORD;
}

export async function startSession() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + TTL * 1000 })).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: TTL,
  });
}
export async function endSession() { (await cookies()).delete(COOKIE); }

export async function isAdmin() {
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v || !secret()) return false;
  const [payload, sig] = v.split(".");
  if (!payload || !sig) return false;
  const expected = sign(payload);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return false;
  try { return JSON.parse(Buffer.from(payload, "base64url").toString()).exp > Date.now(); } catch { return false; }
}

/** Appel d'une fonction d'administration Postgres, protégée par le secret serveur. */
export async function adminRpc<T = unknown>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!(await isAdmin())) throw new Error("unauthorized");
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc(fn, { s: process.env.ADMIN_API_SECRET, ...args });
  if (error) throw new Error(error.message);
  return data as T;
}

/** Adresse IP du visiteur (Vercel renseigne x-forwarded-for / x-real-ip avec l'IP réelle). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (h.get("x-real-ip") || xff || "inconnue").slice(0, 64);
}

/** Appel d'une fonction protégée par le secret serveur, sans exiger de session admin (connexion, suivi IP). */
export async function secretRpc<T = unknown>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc(fn, { s: process.env.ADMIN_API_SECRET, ...args });
  if (error) throw new Error(error.message);
  return data as T;
}
