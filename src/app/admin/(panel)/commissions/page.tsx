import { revalidatePath } from "next/cache";
import { adminRpc } from "@/lib/admin";
import { Pill, Stat, Table, Td } from "@/components/AdminUi";
import { PAY_METHODS, da, dateFr } from "@/lib/format";

type C = { id: string; amount: number; status: "unpaid" | "paid"; method: string | null; paid_at: string | null; created_at: string; driver_name: string; driver_phone: string };

async function settle(fd: FormData) {
  "use server";
  await adminRpc("flixi_admin_settle", { p_id: String(fd.get("id")), p_method: String(fd.get("method")) });
  revalidatePath("/admin/commissions");
}

export default async function Commissions() {
  const rows = await adminRpc<C[]>("flixi_admin_list", { what: "commissions" });
  const unpaid = rows.filter((r) => r.status === "unpaid");
  const byDriver = new Map<string, { name: string; phone: string; total: number; n: number }>();
  unpaid.forEach((r) => {
    const k = r.driver_phone + r.driver_name;
    const cur = byDriver.get(k) ?? { name: r.driver_name, phone: r.driver_phone, total: 0, n: 0 };
    byDriver.set(k, { ...cur, total: cur.total + r.amount, n: cur.n + 1 });
  });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Commissions</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="À encaisser" value={da(unpaid.reduce((s, r) => s + r.amount, 0))} tone="text-rose-600" />
        <Stat label="Encaissées" value={da(rows.filter((r) => r.status === "paid").reduce((s, r) => s + r.amount, 0))} tone="text-emerald-600" />
        <Stat label="Transporteurs débiteurs" value={byDriver.size} />
      </div>
      {byDriver.size > 0 && (
        <div className="card p-5">
          <h2 className="mb-3 font-extrabold">Soldes par transporteur</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[...byDriver.values()].map((d) => (
              <div key={d.phone + d.name} className="rounded-xl bg-violet-50 p-3 text-sm"><b>{d.name}</b> · {d.phone}<div className="font-extrabold text-brand-pink">{da(d.total)} <span className="font-normal text-slate-500">({d.n} course{d.n > 1 ? "s" : ""})</span></div></div>
            ))}
          </div>
        </div>
      )}
      <Table heads={["Date", "Transporteur", "Montant", "Statut", "Enregistrer le paiement"]} empty={!rows.length}>
        {rows.map((c) => (
          <tr key={c.id}>
            <Td>{dateFr(c.created_at)}</Td>
            <Td className="font-bold">{c.driver_name}<div className="text-xs font-normal text-slate-500">{c.driver_phone}</div></Td>
            <Td>{da(c.amount)}</Td>
            <Td>{c.status === "paid" ? <Pill tone="bg-emerald-100 text-emerald-700">Payée · {PAY_METHODS[c.method ?? ""]} · {dateFr(c.paid_at)}</Pill> : <Pill tone="bg-amber-100 text-amber-800">À payer</Pill>}</Td>
            <Td>
              {c.status === "unpaid" && (
                <form action={settle} className="flex gap-2">
                  <input type="hidden" name="id" value={c.id} />
                  <select name="method" className="select !w-auto !py-1 text-xs">{Object.entries(PAY_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                  <button className="btn btn-ok !px-3 !py-1 text-xs">Marquer payée</button>
                </form>
              )}
            </Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
