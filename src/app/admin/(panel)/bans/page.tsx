import { revalidatePath } from "next/cache";
import { adminRpc } from "@/lib/admin";
import { Pill, Table, Td } from "@/components/AdminUi";
import { dateTimeFr } from "@/lib/format";

type B = {
  id: string; reason: string; until: string; ip: string | null; last_ip: string | null; status: "active" | "lifted" | "expired"; appeal: string | null; appeal_at: string | null;
  decision_note: string | null; created_at: string; name: string; phone: string;
};

async function decide(fd: FormData) {
  "use server";
  await adminRpc("flixi_admin_ban_decide", { p_ban: String(fd.get("id")), p_lift: String(fd.get("lift")) === "1", p_note: String(fd.get("note") ?? "") });
  revalidatePath("/admin/bans");
}

export default async function Bans() {
  const rows = await adminRpc<B[]>("flixi_admin_bans", {});
  const pending = rows.filter((r) => r.status === "active" && r.appeal && !r.decision_note).length;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">Bannissements</h1>
        <p className="text-sm text-slate-600">3 annulations de course en moins d&apos;une semaine = bannissement automatique d&apos;1 semaine (avec l&apos;adresse IP). {pending} demande(s) de levée à traiter.</p>
      </div>
      <Table heads={["Date", "Transporteur", "Motif", "Jusqu'au", "Adresse IP", "Demande de levée", "Décision"]} empty={!rows.length}>
        {rows.map((b) => (
          <tr key={b.id} className={b.status === "active" && b.appeal && !b.decision_note ? "bg-amber-50/40" : ""}>
            <Td>{dateTimeFr(b.created_at)}</Td>
            <Td className="font-bold">{b.name}<div className="text-xs font-normal text-slate-500">{b.phone}</div></Td>
            <Td>{b.reason}</Td>
            <Td>{dateTimeFr(b.until)}<div className="mt-1"><Pill tone={b.status === "active" ? "bg-rose-100 text-rose-700" : b.status === "lifted" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}>{b.status === "active" ? "Actif" : b.status === "lifted" ? "Levé" : "Expiré"}</Pill></div></Td>
            <Td><code className="text-xs">{b.ip ?? "—"}</code>{b.last_ip && b.last_ip !== b.ip ? <div className="text-xs text-slate-500">dernière : {b.last_ip}</div> : null}</Td>
            <Td className="max-w-xs">{b.appeal ? <>{b.appeal}<div className="text-xs text-slate-500">{b.appeal_at ? dateTimeFr(b.appeal_at) : ""}</div></> : <span className="text-slate-400">—</span>}</Td>
            <Td>
              {b.status === "active" ? (
                <form action={decide} className="flex flex-col gap-2">
                  <input type="hidden" name="id" value={b.id} />
                  <input name="note" placeholder="Note pour le transporteur" className="input !py-1.5 text-xs" />
                  <div className="flex gap-2">
                    <button name="lift" value="1" className="btn btn-primary !px-3 !py-1 text-xs">Lever le ban</button>
                    <button name="lift" value="0" className="btn btn-danger !px-3 !py-1 text-xs">Maintenir</button>
                  </div>
                  {b.decision_note && <p className="text-xs text-slate-500">Dernière décision : {b.decision_note}</p>}
                </form>
              ) : <span className="text-xs text-slate-500">{b.decision_note ?? "—"}</span>}
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
