"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/Session";
import { Empty, Spinner } from "@/components/ui";
import { da } from "@/lib/format";
import { WILAYAS } from "@/lib/wilayas";
import { useI18n } from "@/lib/i18n";

type Trip = { id: string; from_wilaya: string; to_wilaya: string; depart_date: string; depart_time: string; price: number | null; note: string | null; driver_first_name: string; vehicle_type: string; deliveries: number };

export default function ClientTrips() {
  const { sb } = useSession();
  const { t, w, date } = useI18n();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [f, setF] = useState("");
  const [toF, setToF] = useState("");

  useEffect(() => {
    sb.rpc("flixi_available_trips").then(({ data }) => setTrips((data as Trip[]) ?? []));
  }, [sb]);
  if (!trips) return <Spinner />;
  const list = trips.filter((x) => (!f || x.from_wilaya === f) && (!toF || x.to_wilaya === toF));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold">{t("Transporteurs disponibles")}</h1>
        <p className="text-sm text-slate-500">{t("Trajets annoncés par les transporteurs vérifiés. Publiez votre commande pour recevoir leurs offres.")}</p>
      </div>
      <div className="card grid gap-3 p-4 sm:grid-cols-2">
        <select className="select" value={f} onChange={(e) => setF(e.target.value)}><option value="">{t("Départ : toutes les wilayas")}</option>{WILAYAS.map((x) => <option key={x.code} value={x.name}>{w(x.name)}</option>)}</select>
        <select className="select" value={toF} onChange={(e) => setToF(e.target.value)}><option value="">{t("Arrivée : toutes les wilayas")}</option>{WILAYAS.map((x) => <option key={x.code} value={x.name}>{w(x.name)}</option>)}</select>
      </div>
      {list.length === 0 ? <Empty icon="🚚" title={t("Aucun transporteur sur ce trajet")} text={t("Publiez tout de même votre commande : les transporteurs vous enverront des offres.")} /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((x) => (
            <div key={x.id} className="card p-5">
              <div className="flex items-center justify-between">
                <span className="badge bg-violet-100 text-violet-700">🚚 {x.driver_first_name}</span>
                <span className="text-xs font-bold text-slate-500">{t(x.deliveries > 1 ? "{n} livraisons" : "{n} livraison", { n: x.deliveries })}</span>
              </div>
              <p className="mt-3 text-lg font-extrabold">{w(x.from_wilaya)} <span className="grad-text inline-block rtl:rotate-180">→</span> {w(x.to_wilaya)}</p>
              <p className="mt-1 text-sm text-slate-600">🗓 {t("{d} à {h}", { d: date(x.depart_date), h: x.depart_time.slice(0, 5) })} · {t(x.vehicle_type)}</p>
              {x.note && <p className="mt-2 text-sm text-slate-500">{x.note}</p>}
              <div className="mt-4 flex items-center justify-between">
                <span className="font-extrabold">{x.price ? t("dès {p}", { p: da(x.price) }) : t("Prix à négocier")}</span>
                <Link href={`/client/new?from=${encodeURIComponent(x.from_wilaya)}&to=${encodeURIComponent(x.to_wilaya)}`} className="btn btn-primary !py-2 text-sm">{t("Expédier")}</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
