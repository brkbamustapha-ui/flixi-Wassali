"use client";
import { useMemo } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Live } from "@/lib/adminTypes";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <div className="h-[520px] animate-pulse rounded-2xl bg-violet-100" /> });

export default function LiveMap({ initial }: { initial: Live[] }) {
  const router = useRouter();
  useEffect(() => { const t = setInterval(() => router.refresh(), 10000); return () => clearInterval(t); }, [router]);
  const markers = useMemo(() => initial.flatMap((o) => {
    const m = [];
    if (o.lat != null) m.push({ lat: o.lat, lng: o.lng!, color: "#ff2e7e", emoji: "🚚", label: `${o.driver_name} (${o.driver_phone}) — ${o.goods_type} ${o.from_wilaya}→${o.to_wilaya}` });
    else if (o.from_lat != null) m.push({ lat: o.from_lat, lng: o.from_lng!, color: "#94a3b8", emoji: "⏳", label: `${o.driver_name} — position GPS en attente` });
    return m;
  }), [initial]);
  return (
    <div className="space-y-4">
      <MapView height={520} markers={markers} />
      <div className="grid gap-3 md:grid-cols-2">
        {initial.map((o) => (
          <div key={o.id} className="card p-4 text-sm">
            <p className="font-extrabold">{o.from_wilaya} → {o.to_wilaya} · {o.goods_type}</p>
            <p className="text-slate-600">🚚 {o.driver_name} · {o.driver_phone} — 📦 {o.client_name}</p>
            <p className="text-xs text-slate-500">{o.updated_at ? `Dernière position : ${new Date(o.updated_at).toLocaleTimeString("fr-DZ")}` : "Pas encore de position GPS"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
