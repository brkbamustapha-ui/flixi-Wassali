import type { SupabaseClient } from "@supabase/supabase-js";

export type Pos = { lat: number; lng: number; approx: boolean; city?: string | null };

/** Position approximative via la connexion internet (ordinateur sans GPS / localisation du système coupée). */
export async function ipLocation(): Promise<Pos | null> {
  try {
    const r = await fetch("/api/geo", { cache: "no-store" });
    if (!r.ok) return null;
    const j = (await r.json()) as { ok: boolean; lat: number; lng: number; city?: string | null };
    return j.ok ? { lat: j.lat, lng: j.lng, approx: true, city: j.city } : null;
  } catch { return null; }
}

/** Ordinateur (pas de GPS) : la position se déduit de l'adresse IP. */
export const isDesktop = () => typeof navigator !== "undefined" && !/Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(navigator.userAgent);

/** Position de l'appareil : Wi-Fi/GPS du navigateur ; sur ordinateur, repli automatique sur la position par connexion internet.
 *  Si l'utilisateur a REFUSÉ l'autorisation, aucun repli (renvoie null, denied = true). */
export function getPosition(): Promise<{ pos: Pos | null; denied: boolean }> {
  return new Promise((resolve) => {
    const fallback = async () => resolve({ pos: await ipLocation(), denied: false });
    // Sur ordinateur : adresse IP d'abord (immédiat, aucune autorisation à donner)
    if (isDesktop()) { ipLocation().then((p) => (p ? resolve({ pos: p, denied: false }) : browser())); return; }
    browser();
    function browser() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return void fallback();
    const ok = (p: GeolocationPosition) => resolve({ pos: { lat: p.coords.latitude, lng: p.coords.longitude, approx: false }, denied: false });
    navigator.geolocation.getCurrentPosition(ok, (e) => {
      if (e.code === 1) return resolve({ pos: null, denied: true });
      navigator.geolocation.getCurrentPosition(ok, (e2) => (e2.code === 1 ? resolve({ pos: null, denied: true }) : void fallback()), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 120000 });
    }
  });
}

/** Envoie la position actuelle du transporteur au serveur. */
export async function pingNow(sb: SupabaseClient): Promise<boolean> {
  const { pos } = await getPosition();
  if (!pos) return false;
  const { error } = await sb.rpc("flixi_driver_ping_loc", { p_lat: pos.lat, p_lng: pos.lng });
  return !error;
}
