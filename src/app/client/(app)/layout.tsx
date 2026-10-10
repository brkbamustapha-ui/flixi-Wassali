import { AppGuard } from "@/components/Session";

const nav = [
  { href: "/client", label: "Commandes", icon: "📦" },
  { href: "/client/new", label: "Nouvelle", icon: "➕" },
  { href: "/client/trips", label: "Transporteurs", icon: "🚚" },
  { href: "/client/history", label: "Historique", icon: "🕘" },
  { href: "/client/account", label: "Compte", icon: "👤" },
];
export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppGuard role="client" nav={nav}>{children}</AppGuard>;
}
