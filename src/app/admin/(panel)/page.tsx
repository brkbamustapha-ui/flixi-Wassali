import { adminRpc } from "@/lib/admin";
import { Stat } from "@/components/AdminUi";
import { da } from "@/lib/format";

type Overview = Record<string, number>;

export default async function Overview() {
  const o = await adminRpc<Overview>("flixi_admin_overview");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold">Vue d'ensemble</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Clients inscrits" value={o.clients} />
        <Stat label="Transporteurs inscrits" value={o.drivers} />
        <Stat label="Dossiers à valider" value={o.drivers_pending} tone={o.drivers_pending ? "text-amber-600" : "text-emerald-600"} />
        <Stat label="Transporteurs approuvés" value={o.drivers_approved} />
        <Stat label="Commandes (total)" value={o.orders_total} />
        <Stat label="Ouvertes aux offres" value={o.orders_open} />
        <Stat label="En cours" value={o.orders_active} />
        <Stat label="Livrées" value={o.orders_delivered} />
        <Stat label="Volume d'affaires" value={da(o.volume)} />
        <Stat label="Commissions à encaisser" value={da(o.commissions_unpaid)} tone="text-rose-600" />
        <Stat label="Commissions encaissées" value={da(o.commissions_paid)} tone="text-emerald-600" />
        <Stat label="Clients en ligne" value={o.online_clients ?? 0} tone="text-emerald-600" />
        <Stat label="Transporteurs en ligne" value={o.online_drivers ?? 0} tone="text-emerald-600" />
      </div>
    </div>
  );
}
