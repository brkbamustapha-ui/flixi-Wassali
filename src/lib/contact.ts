/** Coordonnées du support (modifiables via les variables d'environnement Vercel NEXT_PUBLIC_SUPPORT_*). */
export const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "0676412668";
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "";
export const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? SUPPORT_PHONE;
