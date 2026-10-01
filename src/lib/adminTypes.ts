export type AdminDriver = {
  id: string; first_name: string; last_name: string; phone: string; email: string | null; status: string; created_at: string;
  has_file: boolean; approval: "pending" | "approved" | "rejected" | null; admin_note: string | null; wilaya: string | null;
  vehicle_type: string | null; plate_number: string | null; license_kind: string | null; license_number: string | null;
  accepted_terms_at: string | null; deliveries: number; unpaid: number; last_ip?: string | null; last_ip_at?: string | null; online?: boolean;
};
export const APPROVAL_TONE = { pending: "bg-amber-100 text-amber-800", approved: "bg-emerald-100 text-emerald-700", rejected: "bg-rose-100 text-rose-700" } as const;
export const APPROVAL_LABEL = { pending: "À valider", approved: "Approuvé", rejected: "Refusé" } as const;

export type Live = {
  id: string; status: string; goods_type: string; from_wilaya: string; to_wilaya: string;
  from_lat: number | null; from_lng: number | null; to_lat: number | null; to_lng: number | null;
  driver_name: string; driver_phone: string; client_name: string; lat: number | null; lng: number | null; updated_at: string | null;
};
