import { adminRpc } from "@/lib/admin";
import { Pill, Table, Td } from "@/components/AdminUi";
import { ORDER_STATUS, da, dateFr } from "@/lib/format";

type O = { id: string; goods_type: string; from_wilaya: string; to_wilaya: string; client_price: number; final_price: number | null; commission: number; status: string; created_at: string; client_name: string; client_phone: string; driver_name: string | null; driver_phone: string | null; bids: number };

export default async function Orders() {
  const rows = await adminRpc<O[]>("flixi_admin_list", { what: "orders" });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Commandes ({rows.length})</h1>
      <Table heads={["Date", "Trajet", "Marchandise", "Client", "Transporteur", "Prix client", "Prix convenu", "Offres", "Statut"]} empty={!rows.length}>
        {rows.map((o) => (
          <tr key={o.id}>
            <Td>{dateFr(o.created_at)}</Td>
            <Td className="font-bold">{o.from_wilaya} → {o.to_wilaya}</Td>
            <Td>{o.goods_type}</Td>
            <Td>{o.client_name}<div className="text-xs text-slate-500">{o.client_phone}</div></Td>
            <Td>{o.driver_name ?? "—"}<div className="text-xs text-slate-500">{o.driver_phone}</div></Td>
            <Td>{da(o.client_price)}</Td>
            <Td className="font-bold">{o.final_price ? `${da(o.final_price)} (+${da(o.commission)})` : "—"}</Td>
            <Td>{o.bids}</Td>
            <Td><Pill tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Pill></Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
