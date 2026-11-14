import Link from "next/link";
import { redirect } from "next/navigation";
import { adminRpc, endSession, isAdmin } from "@/lib/admin";
import AutoRefresh from "./AutoRefresh";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administration — Flixi Wassali", robots: { index: false } };

async function logout() {
  "use server";
  await endSession();
  redirect("/admin/login");
}

const TABS = [
  ["", "Vue d'ensemble"], ["live", "Carte en direct"], ["drivers", "Transporteurs"], ["clients", "Clients"],
  ["orders", "Commandes"], ["trips", "Trajets"], ["commissions", "Commissions"], ["cancellations", "Annulations"], ["reports", "Signalements"], ["bans", "Bannissements"], ["changes", "Modifications"],
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/admin/login");
  let counts = { disputes: 0, active: 0 };
  try { counts = await adminRpc<{ disputes: number; active: number }>("flixi_admin_cancel_counts", {}); } catch {}
  return (
    <div className="min-h-screen bg-[#f4f0fb]">
      <header className="bg-[#1a1233] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/admin"><Logo size={36} dark /></Link>
          <form action={logout}><button className="btn btn-ghost !py-1.5 text-sm !text-ink">Déconnexion</button></form>
        </div>
        <nav className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 pb-3">
          {TABS.map(([h, l]) => (
            <Link key={h} href={`/admin/${h}`} className="whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-bold text-white/80 hover:bg-white/10 hover:text-white">{l}{h === "cancellations" && (counts.disputes + counts.active > 0) ? <span className={`ms-1.5 rounded-full px-1.5 py-0.5 text-[11px] ${counts.disputes ? "bg-rose-500 text-white" : "bg-sky-400 text-white"}`}>{counts.disputes ? `${counts.disputes} litige(s)` : counts.active}</span> : null}</Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6"><AutoRefresh ms={15000} />{children}</main>
    </div>
  );
}
