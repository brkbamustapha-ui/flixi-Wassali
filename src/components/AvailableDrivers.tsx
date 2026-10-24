"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/Session";
import { Stars } from "@/components/RatePanel";
import { da } from "@/lib/format";
import { tripPassesFrom, tripServes } from "@/lib/tripMatch";
import { useI18n } from "@/lib/i18n";

type T = {
  id: string; ref?: string; from_wilaya: string; to_wilaya: string; allow_enroute?: boolean; depart_date: string; depart_time: string; vehicle_type: string;
  price: number | null; best: number | null; phase: string; is_mine: boolean; rating?: number; rating_count?: number; urgent?: boolean;
};

/** Pendant la rédaction d'une commande : transporteurs disponibles qui PARTENT de la wilaya de départ ou la TRAVERSENT. */
export default function AvailableDrivers({ from, to }: { from: string; to: string }) {
  const { sb } = useSession();
  const { t, w, date } = useI18n();
  const [trips, setTrips] = useState<T[] | null>(null);
  useEffect(() => { sb.rpc("flixi_available_trips").then(({ data }) => setTrips((data as T[]) ?? [])); }, [sb]);
  if (!trips) return null;
  const list = trips
    .filter((x) => !x.is_mine && x.phase === "bidding" && tripPassesFrom(x, from))
    .sort((a, b) => Number(tripServes(b, from, to)) - Number(tripServes(a, from, to)));
  const q = `?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
  if (list.length === 0) return <p className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-600">🚚 {t("Aucun transporteur n'annonce de trajet au départ de {w} ou passant par {w} pour le moment. Publiez quand même votre commande : ils vous enverront des offres.", { w: w(from) })}</p>;
  return (
    <div className="space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
      <p className="text-sm font-extrabold text-emerald-800">🚚 {t("{n} transporteur(s) disponible(s) au départ de {w} ou passant par {w}", { n: list.length, w: w(from) })}</p>
      <div className="space-y-1.5">
        {list.slice(0, 4).map((x) => (
          <Link key={x.id} href={`/client/trips${q}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-2.5 text-sm shadow-sm">
            <span><b>{w(x.from_wilaya)} → {w(x.to_wilaya)}</b> {x.allow_enroute && x.from_wilaya !== from ? <span className="badge bg-emerald-100 text-emerald-700">🛣 {t("passe par {w}", { w: w(from) })}</span> : null}{x.urgent ? <span className="badge ms-1 bg-rose-100 text-rose-700">⚡</span> : null}
              <span className="block text-xs text-slate-500">🗓 {t("{d} à {h}", { d: date(x.depart_date), h: x.depart_time.slice(0, 5) })} · {t(x.vehicle_type)} {(x.rating_count ?? 0) > 0 ? <Stars value={x.rating ?? 0} /> : null}</span></span>
            <span className="text-xs font-bold text-slate-600">{x.best ? t("Meilleure offre : {p}", { p: da(x.best) }) : x.price ? t("Prix annoncé : {p}", { p: da(x.price) }) : ""}</span>
          </Link>
        ))}
      </div>
      <Link href={`/client/trips${q}`} className="btn btn-ghost w-full !py-1.5 text-sm">{t("Voir tous les transporteurs disponibles")} →</Link>
    </div>
  );
}
