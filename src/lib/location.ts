import type { SupabaseClient } from "@supabase/supabase-js";

/** Envoie la position actuelle du transporteur au serveur (localisation réseau d'abord : fonctionne aussi à l'intérieur). */
export function pingNow(sb: SupabaseClient): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(false);
    const send = async (p: GeolocationPosition) => {
      const { error } = await sb.rpc("flixi_driver_ping_loc", { p_lat: p.coords.latitude, p_lng: p.coords.longitude });
      resolve(!error);
    };
    navigator.geolocation.getCurrentPosition(send, () => {
      // 2e essai, GPS haute précision
      navigator.geolocation.getCurrentPosition(send, () => resolve(false), { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 120000 });
  });
}
