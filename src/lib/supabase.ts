import { createBrowserClient } from "@supabase/ssr";
import type { Session } from "@supabase/supabase-js";

let client: ReturnType<typeof createBrowserClient> | null = null;

const BACKUP_KEY = "flixi_session_backup";
export const LAST_ROLE_KEY = "flixi_last_role";

export function supabase() {
  if (!client) {
    client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    if (typeof window !== "undefined") {
      // Copie de secours de la session (en plus du cookie) : on reste connecté même si le cookie est supprimé.
      client.auth.onAuthStateChange((event: string, session: Session | null) => {
        try {
          if (session?.refresh_token) localStorage.setItem(BACKUP_KEY, JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token }));
          else if (event === "SIGNED_OUT") { localStorage.removeItem(BACKUP_KEY); localStorage.removeItem(LAST_ROLE_KEY); }
        } catch {}
      });
      // Demande au navigateur de ne pas effacer nos données
      try { navigator.storage?.persist?.(); } catch {}
    }
  }
  return client;
}

/**
 * Renvoie la session en cours (lue en local, sans réseau). Si le cookie a disparu,
 * on restaure la session depuis la copie de secours. Ne déconnecte jamais sur une simple erreur réseau.
 */
export async function ensureSession(): Promise<Session | null> {
  const sb = supabase();
  const { data } = await sb.auth.getSession();
  if (data.session) return data.session;
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (raw) {
      const b = JSON.parse(raw);
      const r = await sb.auth.setSession({ access_token: b.access_token, refresh_token: b.refresh_token });
      if (r.data.session) return r.data.session;
      // refresh token refusé : la copie est périmée
      if (r.error && /invalid|expired|not found|already used/i.test(r.error.message)) localStorage.removeItem(BACKUP_KEY);
    }
  } catch {}
  return null;
}

export type Profile = {
  id: string; role: "client" | "driver"; first_name: string; last_name: string; phone: string;
  email: string | null; status: "active" | "suspended"; created_at: string; birth_date: string | null; warnings: number; banned_until?: string | null; terms_version?: number | null; terms_accepted_at?: string | null;
};
export type DriverFile = {
  user_id: string; wilaya: string | null; vehicle_type: string; plate_number: string; license_kind: string;
  license_number: string; approval: "pending" | "approved" | "rejected"; admin_note: string | null;
};
export type Order = {
  id: string; client_id: string; goods_type: string; description: string | null; weight_kg: number | null;
  from_wilaya: string; from_address: string | null; from_lat: number | null; from_lng: number | null;
  to_wilaya: string; to_address: string | null; to_lat: number | null; to_lng: number | null;
  client_price: number; status: "open" | "matched" | "in_transit" | "delivered" | "cancelled" | "expired";
  driver_id: string | null; phase?: string; auction_ends_at?: string | null; auction_round?: number; depart_date?: string | null; depart_time?: string | null; direct_driver_id?: string | null; trip_id?: string | null; final_price: number | null; commission: number; created_at: string;
  handling?: boolean; has_img?: boolean; length_cm?: number | null; width_cm?: number | null; height_cm?: number | null;
  want_arrival_date?: string | null; want_arrival_time?: string | null; vehicle_wanted?: string | null; urgent?: boolean; auction_hours?: number | null;
  ref?: string; handlers_count?: number; floor_no?: number | null; driver_brings_handlers?: boolean; from_commune?: string | null; to_commune?: string | null;
  cancel_status?: "requested" | "refused" | null; cancel_by?: "client" | "driver" | null; cancel_reason?: string | null;
};
/** Colonnes d'une commande SANS la photo (lourde) : la photo se charge à la demande. */
export const ORDER_COLS = "id,client_id,goods_type,description,weight_kg,from_wilaya,from_address,from_lat,from_lng,to_wilaya,to_address,to_lat,to_lng,client_price,status,driver_id,final_price,commission,created_at,direct_driver_id,trip_id,depart_date,depart_time,auction_ends_at,auction_round,phase,winning_bid_id,handling,has_img,length_cm,width_cm,height_cm,want_arrival_date,want_arrival_time,vehicle_wanted,urgent,auction_hours,cancel_status,cancel_by,cancel_reason,ref,handlers_count,floor_no,driver_brings_handlers,from_commune,to_commune";
