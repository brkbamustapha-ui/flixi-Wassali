import { adminRpc } from "@/lib/admin";
import { Pill, Table, Td } from "@/components/AdminUi";
import { dateTimeFr, da, cancelFee } from "@/lib/format";
import CancelButtons from "./CancelButtons";
import AutoRefresh from "../AutoRefresh";

type C = {
  id: string; ref: string; status: string; cancel_status: string | null; cancel_by: "client" | "driver"; cancel_reason: string | null; cancel_at: string;
  cancel_admin_ok: boolean | null; cancel_admin_note: string | null; cancel_fee: number | null; resolved_by: string | null; active: boolean; dispute: boolean;
  refusal_reason: string | null; imgs: string[]; refusal_imgs: string[]; price: number;
  from_wilaya: string; to_wilaya: string; client: string; client_phone: string; driver: string | null; driver_phone: string | null;
};

const state = (c: C): [string, string] => {
  if (c.dispute) return ["⚖ LITIGE — à trancher", "bg-rose-100 text-rose-700"];
  if (c.active) return ["En attente de l'autre partie (aucune action requise)", "bg-sky-100 text-sky-700"];
  if (c.status === "cancelled") return [(c.cancel_fee ? "Annulée AVEC frais" : "Annulée sans frais") + (c.resolved_by === "admin" ? " (tranché par l'administration)" : " (accord des parties)"), c.cancel_fee ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"];
  if (c.cancel_status === "refused") return [c.cancel_admin_ok === false ? "Rejetée par l'administration — la course continue" : "Refusée", "bg-slate-200 text-slate-600"];
  return ["—", "bg-slate-200 text-slate-600"];
};

function Imgs({ list }: { list: string[] }) {
  if (!list?.length) return null;
  return <div className="mt-1 flex flex-wrap gap-1">{list.map((src, i) => <a key={i} href={src} target="_blank" rel="noreferrer">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={src} alt="" className="h-16 w-16 rounded-lg object-cover" /></a>)}</div>;
}

export default async function Cancellations() {
  const rows = await adminRpc<C[]>("flixi_admin_cancellations", {});
  const disputes = rows.filter((r) => r.dispute).length, active = rows.filter((r) => r.active && !r.dispute).length;
  return (
    <div className="space-y-5">
      <AutoRefresh />
      <div>
        <h1 className="text-2xl font-extrabold">Annulations de courses</h1>
        <p className="text-sm text-slate-600">Quand un client ou un transporteur demande l&apos;annulation (motif et justificatifs), l&apos;autre partie et l&apos;administration sont prévenus en même temps. Si l&apos;autre partie accepte, c&apos;est terminé sans vous. Si elle refuse, c&apos;est un <b>litige</b> : vous tranchez ici. Frais possibles quand le client annule : 5 % sous 10 000 DA, 1 000 DA au-delà, versés au transporteur.</p>
        <p className="mt-1 text-sm font-bold"><span className="text-rose-700">{disputes} litige(s) à trancher</span> · <span className="text-sky-700">{active} demande(s) en attente de l&apos;autre partie</span></p>
      </div>
      <Table heads={["Date", "Course", "Demandée par", "Motif et justificatifs", "Refus", "Prix", "État", "Décision"]} empty={!rows.length}>
        {rows.map((c) => {
          const [label, tone] = state(c);
          return (
            <tr key={c.id} className={c.dispute ? "bg-rose-50/50" : ""}>
              <Td>{dateTimeFr(c.cancel_at)}</Td>
              <Td className="font-bold">{c.ref}<div className="text-xs font-normal text-slate-500">{c.from_wilaya} → {c.to_wilaya}</div></Td>
              <Td>{c.cancel_by === "client" ? `Client : ${c.client}` : `Transporteur : ${c.driver ?? "—"}`}<div className="text-xs text-slate-500">{c.cancel_by === "client" ? c.client_phone : c.driver_phone}</div></Td>
              <Td className="max-w-xs">{c.cancel_reason ?? "—"}<Imgs list={c.imgs} /></Td>
              <Td className="max-w-xs">{c.refusal_reason ? <>{c.refusal_reason}<Imgs list={c.refusal_imgs} /></> : <span className="text-slate-400">—</span>}{c.cancel_admin_note ? <div className="text-xs text-slate-500">Note admin : {c.cancel_admin_note}</div> : null}</Td>
              <Td>{da(c.price)}{c.cancel_fee ? <div className="text-xs font-bold text-amber-700">frais : {da(c.cancel_fee)}</div> : null}</Td>
              <Td><Pill tone={tone}>{label}</Pill></Td>
              <Td>{c.dispute ? <CancelButtons id={c.id} byClient={c.cancel_by === "client"} fee={da(cancelFee(c.price))} /> : <span className="text-xs text-slate-500">—</span>}</Td>
            </tr>
          );
        })}
      </Table>
    </div>
  );
}
