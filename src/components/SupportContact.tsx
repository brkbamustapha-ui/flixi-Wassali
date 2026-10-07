"use client";
import { SUPPORT_EMAIL, SUPPORT_PHONE, SUPPORT_WHATSAPP } from "@/lib/contact";
import { phoneDigits } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

/** Numéro et contacts du support (affichés seulement s'ils sont configurés). */
export default function SupportContact() {
  const { t } = useI18n();
  if (!SUPPORT_PHONE && !SUPPORT_EMAIL) return null;
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      {SUPPORT_PHONE && <a href={`tel:${phoneDigits(SUPPORT_PHONE)}`} className="btn btn-ghost !py-1.5">📞 <bdi dir="ltr">{SUPPORT_PHONE}</bdi></a>}
      {SUPPORT_WHATSAPP && <a href={`https://wa.me/${phoneDigits(SUPPORT_WHATSAPP).replace(/^0/, "213").replace("+", "")}`} target="_blank" rel="noreferrer" className="btn btn-ghost !py-1.5">WhatsApp</a>}
      {SUPPORT_EMAIL && <a href={`mailto:${SUPPORT_EMAIL}`} className="btn btn-ghost !py-1.5">✉ <bdi dir="ltr">{SUPPORT_EMAIL}</bdi></a>}
      <span className="sr-only">{t("Support")}</span>
    </div>
  );
}
