import { redirect } from "next/navigation";
import { checkCredentials, clientIp, isAdmin, secretRpc, startSession } from "@/lib/admin";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Administration — Flixi Tawsil", robots: { index: false } };
export const dynamic = "force-dynamic";

async function login(formData: FormData) {
  "use server";
  await new Promise((r) => setTimeout(r, 700)); // ralentit les attaques par force brute
  const ip = await clientIp();
  let allowed = true;
  try { allowed = await secretRpc<boolean>("flixi_admin_login_allowed", { p_ip: ip }); } catch {}
  if (!allowed) redirect("/admin/login?error=locked"); // 5 échecs en 15 min : IP bloquée temporairement
  if (!checkCredentials(String(formData.get("username") ?? ""), String(formData.get("password") ?? ""))) {
    try { await secretRpc("flixi_admin_login_failed", { p_ip: ip }); } catch {}
    redirect("/admin/login?error=1");
  }
  try { await secretRpc("flixi_admin_login_ok", { p_ip: ip }); } catch {}
  await startSession();
  redirect("/admin");
}

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await isAdmin()) redirect("/admin");
  const { error } = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1a1233] via-[#2a1656] to-[#4a1a6b] px-4">
      <form action={login} className="card w-full max-w-sm space-y-4 p-8">
        <div className="flex justify-center"><Logo size={42} /></div>
        <p className="text-center text-sm font-bold text-slate-500">Espace administrateur</p>
        <div><label className="label">Nom d'utilisateur</label><input name="username" required autoComplete="username" className="input" /></div>
        <div><label className="label">Mot de passe</label><input name="password" type="password" required autoComplete="current-password" className="input" /></div>
        {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error === "locked" ? "Trop de tentatives échouées. Réessayez dans 15 minutes." : "Identifiants incorrects."}</p>}
        <button className="btn btn-primary w-full">Connexion</button>
      </form>
    </div>
  );
}
