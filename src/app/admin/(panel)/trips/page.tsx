import { adminRpc } from "@/lib/admin";
import { Pill, Table, Td } from "@/components/AdminUi";
import { da, dateFr } from "@/lib/format";

type T = { id: string; ref: string; urgent: boolean; from_wilaya: string; to_wilaya: string; depart_date: string; depart_time: string; price: number | null; status: string; driver_name: string; driver_phone: string };

export default async function Trips() {
  const rows = await adminRpc<T[]>("flixi_admin_list", { what: "trips" });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Trajets annoncés ({rows.length})</h1>
      <Table heads={["Référence", "Transporteur", "Départ", "Arrivée", "Jour", "Heure", "Prix dès", "Statut"]} empty={!rows.length}>
        {rows.map((t) => (
          <tr key={t.id}>
            <Td className="font-extrabold text-brand-pink">{t.ref}{t.urgent ? " ⚡" : ""}</Td>
            <Td className="font-bold">{t.driver_name}<div className="text-xs font-normal text-slate-500">{t.driver_phone}</div></Td>
            <Td>{t.from_wilaya}</Td><Td>{t.to_wilaya}</Td><Td>{dateFr(t.depart_date)}</Td><Td>{t.depart_time.slice(0, 5)}</Td>
            <Td>{t.price ? da(t.price) : "—"}</Td>
            <Td><Pill tone={t.status === "open" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}>{t.status === "open" ? "Ouvert" : "Fermé"}</Pill></Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
