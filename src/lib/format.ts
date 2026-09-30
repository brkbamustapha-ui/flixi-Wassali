export const MIN_PRICE = 1000;
export const COMMISSION = 500;

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
