import { revalidatePath } from "next/cache";
import { adminRpc } from "@/lib/admin";
import { Pill, Table, Td } from "@/components/AdminUi";
import { dateTimeFr } from "@/lib/format";

type C = { id: string; changes: Record<string, string>; status: "pending" | "approved" | "rejected"; note: string | null; created_at: string; name: string; phone: string; current: Record<string, string | null> };
const LABEL: Record<string, string> = { first_name: "Prénom", last_name: "Nom", vehicle_type: "Véhicule", plate_number: "Matricule", wilaya: "Wilaya", license_number: "N° licence / agrément / RC" };

async function decide(fd: FormData) {
  "use server";
  await adminRpc("flixi_admin_decide_change", { p_id: String(fd.get("id")), p_approve: String(fd.get("approve")) === "1", p_note: String(fd.get("note") ?? "") });
  revalidatePath("/admin/changes");
}

export default async function Changes() {
  const rows = await adminRpc<C[]>("flixi_admin_changes", {});
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-extrabold">Demandes de modification (transporteurs)</h1><p className="text-sm text-slate-600">Un transporteur modifie son compte puis envoie une demande : elle n&apos;est appliquée qu&apos;après votre accord.</p></div>
      <Table heads={["Date", "Transporteur", "Modifications demandées", "Décision"]} empty={!rows.length}>
        {rows.map((r) => (
          <tr key={r.id} className={r.status === "pending" ? "bg-amber-50/40" : ""}>
            <Td>{dateTimeFr(r.created_at)}</Td>
            <Td className="font-bold">{r.name}<div className="text-xs font-normal text-slate-500">{r.phone}</div></Td>
            <Td>{Object.entries(r.changes).map(([k, v]) => <div key={k} className="text-xs"><b>{LABEL[k] ?? k}</b> : <span className="text-slate-500 line-through">{r.current[k] ?? "—"}</span> → <b>{v}</b></div>)}</Td>
            <Td>
              {r.status === "pending" ? (
                <form action={decide} className="flex flex-col gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <input name="note" placeholder="Note (facultatif)" className="input !py-1.5 text-xs" />
                  <div className="flex gap-2">
                    <button name="approve" value="1" className="btn btn-primary !px-3 !py-1 text-xs">Accepter</button>
                    <button name="approve" value="0" className="btn btn-danger !px-3 !py-1 text-xs">Refuser</button>
                  </div>
                </form>
              ) : <Pill tone={r.status === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}>{r.status === "approved" ? "Accepté" : "Refusé"}</Pill>}
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
