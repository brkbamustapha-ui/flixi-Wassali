import Link from "next/link";
import { notFound } from "next/navigation";
import { adminRpc } from "@/lib/admin";
import { Table, Td } from "@/components/AdminUi";
import { dateTimeFr } from "@/lib/format";

type Ip = { ip: string; user_agent: string | null; first_seen: string; last_seen: string; hits: number };
type U = { id: string; first_name: string; last_name: string; phone: string; email: string | null; created_at: string };

export default async function UserDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [clients, drivers] = await Promise.all([adminRpc<U[]>("flixi_admin_list", { what: "clients" }), adminRpc<U[]>("flixi_admin_list", { what: "drivers" })]);
  const isClient = clients.some((c) => c.id === id);
  const u = [...clients, ...drivers].find((x) => x.id === id);
  if (!u) notFound();
  const ips = await adminRpc<Ip[]>("flixi_admin_user_ips", { p_id: id });
  return (
    <div className="space-y-5">
      <Link href={isClient ? "/admin/clients" : "/admin/drivers"} className="text-sm font-bold text-brand-pink">← {isClient ? "Clients" : "Transporteurs"}</Link>
      <div className="card p-6">
        <h1 className="text-2xl font-extrabold">{u.first_name} {u.last_name} <span className="badge bg-violet-100 text-violet-700">{isClient ? "Client" : "Transporteur"}</span></h1>
        <p className="mt-1 text-sm text-slate-600">📞 {u.phone} · ✉ {u.email} · inscrit le {dateTimeFr(u.created_at)}</p>
        {!isClient && <Link href={`/admin/drivers/${id}`} className="mt-3 inline-block text-sm font-bold text-brand-pink">Voir le dossier du transporteur →</Link>}
      </div>
      <h2 className="text-lg font-extrabold">Adresses IP ({ips.length})</h2>
      <Table heads={["Adresse IP", "Première connexion", "Dernière connexion", "Visites", "Appareil / navigateur"]} empty={!ips.length}>
        {ips.map((i) => (
          <tr key={i.ip}>
            <Td className="font-mono font-bold">{i.ip}</Td><Td>{dateTimeFr(i.first_seen)}</Td><Td>{dateTimeFr(i.last_seen)}</Td><Td>{i.hits}</Td>
            <Td className="max-w-xs break-words text-xs text-slate-500">{i.user_agent ?? "—"}</Td>
          </tr>
        ))}
      </Table>
      <p className="text-xs text-slate-500">L'adresse IP est enregistrée à chaque connexion à l'application (au plus une fois toutes les 30 minutes par appareil).</p>
    </div>
  );
}
