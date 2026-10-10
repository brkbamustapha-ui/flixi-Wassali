"use client";
import { useEffect, useRef, useState } from "react";
import type * as L from "leaflet";

export type MapMarker = { lat: number; lng: number; color: string; label?: string; emoji?: string; onDrag?: (lat: number, lng: number) => void };
type Props = {
  markers?: MapMarker[];
  line?: [number, number][];
  center?: [number, number];
  zoom?: number;
  height?: number;
  onPick?: (lat: number, lng: number) => void;
  fit?: boolean;
  /** Recentre la carte (vol animé) quand cette valeur change. */
  focus?: { lat: number; lng: number; zoom?: number; key?: string | number } | null;
};

const ALGERIA: [number, number] = [28.5, 2.6];

/** Carte OpenStreetMap : plein écran, « ma position », molette activée au toucher, marqueurs déplaçables (style application de VTC). */
export default function MapView({ markers = [], line, center, zoom, height = 320, onPick, fit = true, focus }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const lib = useRef<typeof L | null>(null);
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const fitted = useRef(false);
  const [full, setFull] = useState(false);
  const [locErr, setLocErr] = useState(false);

  useEffect(() => {
    let dead = false;
    (async () => {
      const Lf = (await import("leaflet")).default as typeof L;
      if (dead || !el.current || map.current) return;
      lib.current = Lf;
      const m = Lf.map(el.current, { scrollWheelZoom: false, zoomControl: false }).setView(center ?? ALGERIA, zoom ?? (center ? 8 : 5));
      Lf.control.zoom({ position: "bottomright" }).addTo(m);
      Lf.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(m);
      layer.current = Lf.layerGroup().addTo(m);
      m.on("click", (e: L.LeafletMouseEvent) => { m.scrollWheelZoom.enable(); pickRef.current?.(e.latlng.lat, e.latlng.lng); });
      m.on("focus", () => m.scrollWheelZoom.enable());
      m.on("blur", () => m.scrollWheelZoom.disable());
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
        iconSize: [38, 38],
        iconAnchor: [19, 19],
        html: `<div style="width:38px;height:38px;border-radius:50%;background:${k.color};border:3px solid #fff;box-shadow:0 4px 12px rgba(26,18,51,.35);display:flex;align-items:center;justify-content:center;font-size:18px">${k.emoji ?? ""}</div>`,
      });
      const mk = Lf.marker([k.lat, k.lng], { icon, draggable: !!k.onDrag }).addTo(g);
      if (k.onDrag) mk.on("dragend", () => { const p = mk.getLatLng(); k.onDrag!(p.lat, p.lng); });
      if (k.label) mk.bindTooltip(k.label, { direction: "top", offset: [0, -18] });
    });
    if (line && line.length > 1) Lf.polyline(line, { color: "#ff2e7e", weight: 4, opacity: 0.8, dashArray: "8 8" }).addTo(g);
    if (fit && pts.length && !fitted.current) {
      if (pts.length === 1) m.setView(pts[0], zoom ?? 9);
      else m.fitBounds(Lf.latLngBounds(pts), { padding: [40, 40], maxZoom: 9 });
      fitted.current = pts.length > 1;
    }
  }

  useEffect(draw, [JSON.stringify(markers.map((k) => [k.lat, k.lng, k.color, k.label])), JSON.stringify(line)]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (focus && map.current) map.current.flyTo([focus.lat, focus.lng], focus.zoom ?? 13, { duration: 0.8 });
  }, [focus?.lat, focus?.lng, focus?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setTimeout(() => map.current?.invalidateSize(), 60); }, [full]);
  useEffect(() => {
    if (!full) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [full]);

  function locate() {
    setLocErr(false);
    navigator.geolocation?.getCurrentPosition(
      (p) => map.current?.flyTo([p.coords.latitude, p.coords.longitude], 15, { duration: 0.8 }),
      () => setLocErr(true),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  const btn = "flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-bold shadow-lg ring-1 ring-black/10 active:scale-95";
  return (
    <div className={full ? "fixed inset-0 z-[70] bg-white" : "relative"} style={full ? undefined : { height, width: "100%" }}>
      <div ref={el} style={{ height: full ? "100%" : height, width: "100%" }} className={full ? "" : "border border-violet-200 overflow-hidden rounded-2xl"} />
      <div className="absolute start-2 top-2 z-[1000] flex flex-col gap-2">
        <button type="button" onClick={() => setFull((v) => !v)} className={btn} aria-label="Plein écran">{full ? "✕" : "⛶"}</button>
        <button type="button" onClick={locate} className={btn} aria-label="Ma position">🎯</button>
      </div>
      {locErr && <p className="absolute inset-x-2 bottom-2 z-[1000] rounded-xl bg-rose-600 px-3 py-2 text-center text-xs font-bold text-white">📍 Localisation indisponible — activez-la dans votre navigateur.</p>}
    </div>
  );
}
