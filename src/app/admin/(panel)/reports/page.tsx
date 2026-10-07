import { revalidatePath } from "next/cache";
import { adminRpc } from "@/lib/admin";
import { Pill, Table, Td } from "@/components/AdminUi";
import { da, dateTimeFr } from "@/lib/format";

type R = {
  id: string; kind: "no_show" | "goods_issue" | "driver_cancel" | "client_cancel" | "cancel_refused"; reason: string | null; amount: number | null;
  status: "open" | "warned" | "closed"; created_at: string; order_id: string | null; route: string | null;
  reporter: string; reporter_role: string; reporter_phone: string;
  against_id: string | null; against: string | null; against_role: string | null; against_phone: string | null; warnings: number | null;
};

const KIND: Record<R["kind"], string> = {
  no_show: "🚫 Client n'a pas chargé (10 % dû)", goods_issue: "⛔ Marchandise interdite / non conforme", driver_cancel: "↩ Annulation par le transporteur",
  client_cancel: "↩ Annulation par le client", cancel_refused: "✖ Annulation refusée",
};

async function warn(fd: FormData) {
  "use server";
  await adminRpc("flixi_admin_warn", { p_report: String(fd.get("id")) });
  revalidatePath("/admin/reports");
}
async function close(fd: FormData) {
  "use server";
  await adminRpc("flixi_admin_report_close", { p_report: String(fd.get("id")) });
  revalidatePath("/admin/reports");
}

export default async function Reports() {
  const rows = await adminRpc<R[]>("flixi_admin_reports", {});
  const open = rows.filter((r) => r.status === "open").length;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">Signalements et annulations</h1>
        <p className="text-sm text-slate-600">{open} à traiter. Un avertissement est ajouté à la personne visée ; au bout de 2 avertissements son compte est automatiquement banni (suspendu).</p>
      </div>
      <Table heads={["Date", "Type", "Trajet", "Signalé par", "Personne visée", "Justification", "Action"]} empty={!rows.length}>
        {rows.map((r) => (
          <tr key={r.id} className={r.status === "open" ? "bg-amber-50/40" : ""}>
            <Td>{dateTimeFr(r.created_at)}</Td>
            <Td><b>{KIND[r.kind]}</b>{r.amount ? <div className="text-xs text-slate-500">À régler : {da(r.amount)}</div> : null}</Td>
            <Td>{r.route ?? "—"}</Td>
            <Td>{r.reporter}<div className="text-xs text-slate-500">{r.reporter_role} · {r.reporter_phone}</div></Td>
            <Td>{r.against ?? "—"}<div className="text-xs text-slate-500">{r.against_role} · {r.against_phone} · {r.warnings ?? 0}/2 avert.</div></Td>
            <Td className="max-w-xs">{r.reason ?? "—"}</Td>
            <Td>
              {r.status === "open" ? (
                <div className="flex flex-wrap gap-2">
                  {r.against_id && <form action={warn}><input type="hidden" name="id" value={r.id} /><button className="btn btn-danger !px-3 !py-1 text-xs">⚠ Avertir</button></form>}
                  <form action={close}><input type="hidden" name="id" value={r.id} /><button className="btn btn-ghost !px-3 !py-1 text-xs">Classer</button></form>
                </div>
              ) : <Pill tone={r.status === "warned" ? "bg-rose-100 text-rose-700" : "bg-slate-200 text-slate-600"}>{r.status === "warned" ? "Avertissement donné" : "Classé"}</Pill>}
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
