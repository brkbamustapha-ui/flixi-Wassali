import { adminRpc } from "@/lib/admin";
import { Pill, Table, Td } from "@/components/AdminUi";
import { ORDER_STATUS, da, dateFr } from "@/lib/format";

type O = { id: string; ref: string; from_commune: string | null; to_commune: string | null; urgent: boolean; handlers_count: number; floor_no: number | null; delivered_at: string | null; goods_type: string; from_wilaya: string; to_wilaya: string; client_price: number; final_price: number | null; commission: number; status: string; created_at: string; client_name: string; client_phone: string; driver_name: string | null; driver_phone: string | null; bids: number };

export default async function Orders() {
  const rows = await adminRpc<O[]>("flixi_admin_list", { what: "orders" });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Commandes ({rows.length})</h1>
      <Table heads={["Référence", "Date", "Trajet", "Marchandise", "Client", "Transporteur", "Prix client", "Prix convenu", "Offres", "Statut"]} empty={!rows.length}>
        {rows.map((o) => (
          <tr key={o.id}>
            <Td className="font-extrabold text-brand-pink">{o.ref}{o.urgent ? " ⚡" : ""}</Td>
            <Td>{dateFr(o.created_at)}{o.delivered_at ? <div className="text-xs text-slate-500">Livrée {dateFr(o.delivered_at)}</div> : null}</Td>
            <Td className="font-bold">{o.from_wilaya}{o.from_commune ? ` (${o.from_commune})` : ""} → {o.to_wilaya}{o.to_commune ? ` (${o.to_commune})` : ""}</Td>
            <Td>{o.goods_type}{o.handlers_count ? <div className="text-xs text-slate-500">{o.handlers_count} manutentionnaire(s){o.floor_no != null ? ` · étage ${o.floor_no}` : ""}</div> : null}</Td>
            <Td>{o.client_name}<div className="text-xs text-slate-500">{o.client_phone}</div></Td>
            <Td>{o.driver_name ?? "—"}<div className="text-xs text-slate-500">{o.driver_phone}</div></Td>
            <Td>{da(o.client_price)}</Td>
            <Td className="font-bold">{o.final_price ? `${da(o.final_price)} (commission ${da(o.commission)})` : "—"}</Td>
            <Td>{o.bids}</Td>
            <Td><Pill tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</Pill></Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
