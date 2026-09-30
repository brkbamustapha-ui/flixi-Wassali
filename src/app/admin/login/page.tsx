import { redirect } from "next/navigation";
import { checkCredentials, isAdmin, startSession } from "@/lib/admin";
import { Logo } from "@/components/Logo";

export const metadata = { title: "Administration — Flixi Tawsil", robots: { index: false } };
export const dynamic = "force-dynamic";

async function login(formData: FormData) {
  "use server";
  await new Promise((r) => setTimeout(r, 700)); // ralentit les attaques par force brute
  if (!checkCredentials(String(formData.get("username") ?? ""), String(formData.get("password") ?? ""))) redirect("/admin/login?error=1");
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
        {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">Identifiants incorrects.</p>}
        <button className="btn btn-primary w-full">Connexion</button>
      </form>
    </div>
  );
}
