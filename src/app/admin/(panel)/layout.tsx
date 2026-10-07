import Link from "next/link";
import { redirect } from "next/navigation";
import { endSession, isAdmin } from "@/lib/admin";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administration — Flixi Tawsil", robots: { index: false } };

async function logout() {
  "use server";
  await endSession();
  redirect("/admin/login");
}

const TABS = [
  ["", "Vue d'ensemble"], ["live", "Carte en direct"], ["drivers", "Transporteurs"], ["clients", "Clients"],
  ["orders", "Commandes"], ["trips", "Trajets"], ["commissions", "Commissions"], ["reports", "Signalements"],
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/admin/login");
  return (
    <div className="min-h-screen bg-[#f4f0fb]">
      <header className="bg-[#1a1233] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/admin"><Logo size={36} dark /></Link>
          <form action={logout}><button className="btn btn-ghost !py-1.5 text-sm !text-ink">Déconnexion</button></form>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3">
          {TABS.map(([h, l]) => (
            <Link key={h} href={`/admin/${h}`} className="whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-bold text-white/80 hover:bg-white/10 hover:text-white">{l}</Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
