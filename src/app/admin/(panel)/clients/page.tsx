import Link from "next/link";
import { revalidatePath } from "next/cache";
import { adminRpc } from "@/lib/admin";
import { Pill, Table, Td } from "@/components/AdminUi";
import { dateFr } from "@/lib/format";

type Client = { id: string; first_name: string; last_name: string; phone: string; email: string | null; status: string; created_at: string; orders: number; last_ip: string | null; last_ip_at: string | null; online: boolean };

async function setStatus(fd: FormData) {
  "use server";
  await adminRpc("flixi_admin_set_status", { p_id: String(fd.get("id")), p_status: String(fd.get("status")) });
  revalidatePath("/admin/clients");
}

export default async function Clients() {
  const rows = await adminRpc<Client[]>("flixi_admin_list", { what: "clients" });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Clients ({rows.length})</h1>
      <Table heads={["Nom", "Téléphone", "Email", "Dernière IP", "Commandes", "Inscrit le", "Statut", ""]} empty={!rows.length}>
        {rows.map((c) => (
          <tr key={c.id}>
            <Td className="font-bold">{c.online && <span title="En ligne" className="me-1 text-emerald-500">●</span>}{c.first_name} {c.last_name}</Td>
            <Td>{c.phone}</Td><Td>{c.email}</Td>
            <Td><Link href={`/admin/users/${c.id}`} className="font-mono text-xs font-bold text-brand-pink hover:underline">{c.last_ip ?? "—"}</Link></Td>
            <Td>{c.orders}</Td><Td>{dateFr(c.created_at)}</Td>
            <Td><Pill tone={c.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}>{c.status === "active" ? "Actif" : "Suspendu"}</Pill></Td>
            <Td>
              <form action={setStatus}>
                <input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value={c.status === "active" ? "suspended" : "active"} />
                <button className="btn btn-ghost !px-3 !py-1 text-xs">{c.status === "active" ? "Suspendre" : "Réactiver"}</button>
              </form>
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
