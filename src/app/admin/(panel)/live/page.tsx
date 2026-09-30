import { adminRpc } from "@/lib/admin";
import LiveMap from "./LiveMap";
import type { Live } from "@/lib/adminTypes";

export default async function LivePage() {
  const rows = await adminRpc<Live[]>("flixi_admin_live");
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Carte en direct ({rows.length} livraison{rows.length > 1 ? "s" : ""} en cours)</h1>
      <LiveMap initial={rows} />
    </div>
  );
}
