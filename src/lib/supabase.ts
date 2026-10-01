import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function supabase() {
  if (!client) {
    client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  }
  return client;
}

export type Profile = {
  id: string; role: "client" | "driver"; first_name: string; last_name: string; phone: string;
  email: string | null; status: "active" | "suspended"; created_at: string;
};
export type DriverFile = {
  user_id: string; wilaya: string | null; vehicle_type: string; plate_number: string; license_kind: string;
  license_number: string; approval: "pending" | "approved" | "rejected"; admin_note: string | null;
};
export type Order = {
  id: string; client_id: string; goods_type: string; description: string | null; weight_kg: number | null;
  from_wilaya: string; from_address: string | null; from_lat: number | null; from_lng: number | null;
  to_wilaya: string; to_address: string | null; to_lat: number | null; to_lng: number | null;
  client_price: number; status: "open" | "matched" | "in_transit" | "delivered" | "cancelled";
  driver_id: string | null; direct_driver_id?: string | null; trip_id?: string | null; final_price: number | null; commission: number; created_at: string;
};
