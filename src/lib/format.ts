/** Prix libre : aucun minimum métier (petits colis en moto possibles). */
export const MIN_PRICE = 1;

/** Commission Flixi, payée par le transporteur : 12 % (< 5000 DA), 10 % (5000–8000 DA), 8 % (> 8000 DA). */
export const commissionRate = (price: number) => (price < 5000 ? 0.12 : price <= 8000 ? 0.1 : 0.08);
export const commissionFor = (price: number) => Math.round(price * commissionRate(price));

export const da = (n: number | null | undefined) =>
  `${Number(n ?? 0).toLocaleString("fr-FR").replace(/ | /g, " ")} DA`;

export const dateFr = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("fr-DZ", { day: "2-digit", month: "short", year: "numeric" }) : "-";

export const dateTimeFr = (d?: string | null) =>
  d ? new Date(d).toLocaleString("fr-DZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";

export const ORDER_STATUS: Record<string, { label: string; tone: string }> = {
  open: { label: "Ouverte aux offres", tone: "bg-amber-100 text-amber-800" },
  matched: { label: "Conclue", tone: "bg-emerald-100 text-emerald-800" },
  in_transit: { label: "En route", tone: "bg-sky-100 text-sky-800" },
  delivered: { label: "Livrée", tone: "bg-violet-100 text-violet-800" },
  cancelled: { label: "Annulée", tone: "bg-slate-200 text-slate-600" },
  expired: { label: "Expirée", tone: "bg-slate-200 text-slate-600" },
};

export const GOODS_TYPES = [
  "Colis / Cartons", "Meubles", "Électroménager", "Matériaux de construction", "Produits alimentaires",
  "Marchandises en gros", "Palettes", "Véhicule / Moto", "Produits agricoles", "Équipements industriels", "Autre",
];

export const VEHICLE_TYPES = [
  "Camionnette (Berlingo, Kangoo…)", "Fourgon (Master, Sprinter…)", "Camion léger (3-5 t)", "Camion (10 t)",
  "Semi-remorque", "Plateau / Benne", "Camion frigorifique", "Autre",
];

export const PAY_METHODS: Record<string, string> = {
  edahabia: "Edahabia", cib: "CIB", visa: "Visa", mastercard: "Mastercard", especes: "Espèces",
};

/** Nettoie un numéro algérien pour les liens tel:/wa.me */
export const phoneDigits = (p: string) => p.replace(/[^\d+]/g, "");
export const validPhoneDZ = (p: string) => /^(?:\+213|00213|0)[5-7]\d{8}$/.test(p.replace(/[\s.-]/g, ""));

/** Algérie = UTC+1 toute l'année */
export const departDate = (d: string, t: string) => new Date(`${d}T${t.length === 5 ? t : t.slice(0, 5)}:00+01:00`);

/** Départ : au moins 10 minutes à l'avance ; moins de 2 h = commande URGENTE (visible en priorité par les transporteurs). */
export function auctionPreview(d: string, t: string) {
  if (!d || !t) return null;
  const dep = departDate(d, t).getTime();
  if (Number.isNaN(dep)) return null;
  const left = dep - Date.now();
  return { dep: new Date(dep), ok: left >= 10 * 60 * 1000, urgent: left < 2 * 3600 * 1000 };
}

export const AUCTION_HOURS = [1, 3, 6, 12, 24, 48];
export const CANCEL_FREE_HOURS = 24;
export const hoursUntil = (d?: string | null, t?: string | null) => (d && t ? (departDate(d, t).getTime() - Date.now()) / 3600000 : Infinity);
