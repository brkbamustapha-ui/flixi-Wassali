import { AppGuard } from "@/components/Session";

const nav = [
  { href: "/driver", label: "Accueil", icon: "🏠" },
  { href: "/driver/requests", label: "Demandes", icon: "📦" },
  { href: "/driver/trips", label: "Mes trajets", icon: "🗓" },
  { href: "/driver/commissions", label: "Commissions", icon: "💳" },
  { href: "/driver/account", label: "Compte", icon: "👤" },
];
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppGuard role="driver" nav={nav}>{children}</AppGuard>;
}
