"use client";
import { useEffect, useRef } from "react";
import type * as L from "leaflet";

export type MapMarker = { lat: number; lng: number; color: string; label?: string; emoji?: string };
type Props = {
  markers?: MapMarker[];
  line?: [number, number][];
  center?: [number, number];
  zoom?: number;
  height?: number;
  onPick?: (lat: number, lng: number) => void;
  fit?: boolean;
};

const ALGERIA: [number, number] = [28.5, 2.6];

export default function MapView({ markers = [], line, center, zoom, height = 320, onPick, fit = true }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const lib = useRef<typeof L | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const fitted = useRef(false);

  useEffect(() => {
    let dead = false;
    (async () => {
      const Lf = (await import("leaflet")).default as typeof L;
      if (dead || !el.current || map.current) return;
      lib.current = Lf;
      const m = Lf.map(el.current, { scrollWheelZoom: false }).setView(center ?? ALGERIA, zoom ?? (center ? 8 : 5));
      Lf.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap", maxZoom: 18,
      }).addTo(m);
      layer.current = Lf.layerGroup().addTo(m);
      m.on("click", (e: L.LeafletMouseEvent) => pickRef.current?.(e.latlng.lat, e.latlng.lng));
      map.current = m;
      draw();
    })();
    return () => {
      dead = true;
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function draw() {
    const Lf = lib.current, m = map.current, g = layer.current;
    if (!Lf || !m || !g) return;
    g.clearLayers();
    const pts: [number, number][] = [];
    markers.forEach((k) => {
      pts.push([k.lat, k.lng]);
      const icon = Lf.divIcon({
        className: "",
        iconSize: [34, 34],
        iconAnchor: [17, 17],
        html: `<div style="width:34px;height:34px;border-radius:50%;background:${k.color};border:3px solid #fff;box-shadow:0 4px 12px rgba(26,18,51,.35);display:flex;align-items:center;justify-content:center;font-size:16px">${k.emoji ?? ""}</div>`,
      });
      const mk = Lf.marker([k.lat, k.lng], { icon }).addTo(g);
      if (k.label) mk.bindTooltip(k.label, { direction: "top", offset: [0, -16] });
    });
    if (line && line.length > 1) Lf.polyline(line, { color: "#ff2e7e", weight: 4, opacity: 0.8, dashArray: "8 8" }).addTo(g);
    if (fit && pts.length && !fitted.current) {
      if (pts.length === 1) m.setView(pts[0], zoom ?? 9);
      else m.fitBounds(Lf.latLngBounds(pts), { padding: [40, 40], maxZoom: 9 });
      fitted.current = pts.length > 1;
    }
  }

  useEffect(draw, [JSON.stringify(markers), JSON.stringify(line)]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={el} style={{ height, width: "100%" }} className="border border-violet-200 overflow-hidden rounded-2xl" />;
}
