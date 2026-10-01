import Link from "next/link";
import { adminRpc } from "@/lib/admin";
import { Pill, Table, Td } from "@/components/AdminUi";
import { da, dateFr } from "@/lib/format";
import { APPROVAL_LABEL, APPROVAL_TONE, type AdminDriver } from "@/lib/adminTypes";


export default async function Drivers() {
  const rows = await adminRpc<AdminDriver[]>("flixi_admin_list", { what: "drivers" });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Transporteurs ({rows.length})</h1>
      <Table heads={["Nom", "Téléphone", "Véhicule / Matricule", "Wilaya", "Dernière IP", "Livraisons", "Commission due", "Dossier", ""]} empty={!rows.length}>
        {rows.map((d) => (
          <tr key={d.id}>
            <Td className="font-bold">{d.online && <span title="En ligne" className="me-1 text-emerald-500">●</span>}{d.first_name} {d.last_name}<div className="text-xs font-normal text-slate-500">{d.email} · inscrit le {dateFr(d.created_at)}</div></Td>
            <Td>{d.phone}</Td>
            <Td>{d.vehicle_type ?? "—"}<div className="text-xs text-slate-500">{d.plate_number}</div></Td>
            <Td>{d.wilaya ?? "—"}</Td>
            <Td><Link href={`/admin/users/${d.id}`} className="font-mono text-xs font-bold text-brand-pink hover:underline">{d.last_ip ?? "—"}</Link></Td>
            <Td>{d.deliveries}</Td><Td>{da(d.unpaid)}</Td>
            <Td>{d.has_file && d.approval ? <Pill tone={APPROVAL_TONE[d.approval]}>{APPROVAL_LABEL[d.approval]}</Pill> : <Pill tone="bg-slate-200 text-slate-600">Dossier non envoyé</Pill>}</Td>
            <Td><Link href={`/admin/drivers/${d.id}`} className="btn btn-ghost !px-3 !py-1 text-xs">Ouvrir</Link></Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
