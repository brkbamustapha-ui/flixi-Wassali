import { adminRpc } from "@/lib/admin";
import { Pill, Table, Td } from "@/components/AdminUi";
import { dateTimeFr, da } from "@/lib/format";
import CancelButtons from "./CancelButtons";

type C = {
  id: string; ref: string; status: string; cancel_status: string | null; cancel_by: "client" | "driver"; cancel_reason: string | null; cancel_at: string;
  cancel_admin_ok: boolean | null; cancel_admin_note: string | null; cancel_fee: number | null; pending: boolean; price: number;
  from_wilaya: string; to_wilaya: string; client: string; client_phone: string; driver: string | null; driver_phone: string | null;
};

const state = (c: C) => {
  if (c.status === "cancelled") return c.cancel_fee ? ["Annulée AVEC frais", "bg-amber-100 text-amber-800"] : ["Annulée sans frais", "bg-emerald-100 text-emerald-700"];
  if (c.cancel_status === "refused") return [c.cancel_admin_ok === false ? "Refusée par l'administration" : "Refusée par l'autre partie", "bg-slate-200 text-slate-600"];
  if (c.pending) return ["À traiter", "bg-rose-100 text-rose-700"];
  return ["Validée — en attente de l'autre partie", "bg-sky-100 text-sky-700"];
};

export default async function Cancellations() {
  const rows = await adminRpc<C[]>("flixi_admin_cancellations", {});
  const pending = rows.filter((r) => r.pending).length;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">Annulations de courses</h1>
        <p className="text-sm text-slate-600">Toute demande d&apos;annulation (motif obligatoire) est traitée ici. Une fois validée, l&apos;autre partie doit l&apos;accepter : sans frais, ou avec 10 % du prix quand c&apos;est le client qui annule (frais encaissés par le transporteur). {pending} demande(s) à traiter.</p>
      </div>
      <Table heads={["Date", "Course", "Demandée par", "Motif", "Prix", "État", "Décision"]} empty={!rows.length}>
        {rows.map((c) => {
          const [label, tone] = state(c);
          return (
            <tr key={c.id} className={c.pending ? "bg-amber-50/40" : ""}>
              <Td>{dateTimeFr(c.cancel_at)}</Td>
              <Td className="font-bold">{c.ref}<div className="text-xs font-normal text-slate-500">{c.from_wilaya} → {c.to_wilaya}</div></Td>
              <Td>{c.cancel_by === "client" ? `Client : ${c.client}` : `Transporteur : ${c.driver ?? "—"}`}<div className="text-xs text-slate-500">{c.cancel_by === "client" ? c.client_phone : c.driver_phone}</div></Td>
              <Td className="max-w-xs">{c.cancel_reason ?? "—"}{c.cancel_admin_note ? <div className="text-xs text-slate-500">Note admin : {c.cancel_admin_note}</div> : null}</Td>
              <Td>{da(c.price)}{c.cancel_fee ? <div className="text-xs font-bold text-amber-700">frais : {da(c.cancel_fee)}</div> : null}</Td>
              <Td><Pill tone={tone}>{label}</Pill></Td>
              <Td>{c.pending ? <CancelButtons id={c.id} /> : <span className="text-xs text-slate-500">—</span>}</Td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
