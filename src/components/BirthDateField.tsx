"use client";
import { useI18n } from "@/lib/i18n";
import { Field } from "@/components/ui";

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

/** Date de naissance : jour / mois / année (champs birth_day, birth_month, birth_year). */
export default function BirthDateField() {
  const { t } = useI18n();
  const now = new Date().getFullYear();
  return (
    <Field label={t("Date de naissance (19 ans minimum)")}>
      <div className="grid grid-cols-[1fr_1.6fr_1.2fr] gap-2">
        <select name="birth_day" required defaultValue="" className="select" aria-label={t("Jour")}>
          <option value="" disabled>{t("Jour")}</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select name="birth_month" required defaultValue="" className="select" aria-label={t("Mois")}>
          <option value="" disabled>{t("Mois")}</option>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{t(m)}</option>)}
        </select>
        <select name="birth_year" required defaultValue="" className="select" aria-label={t("Année")}>
          <option value="" disabled>{t("Année")}</option>
          {Array.from({ length: 100 }, (_, i) => now - i).map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </Field>
  );
}

/** Lit la date du formulaire → "AAAA-MM-JJ" (ou null si invalide). */
export function readBirth(f: FormData): string | null {
  const d = Number(f.get("birth_day")), m = Number(f.get("birth_month")), y = Number(f.get("birth_year"));
  if (!d || !m || !y) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Vrai si la personne a au moins 19 ans aujourd'hui. */
export function isAdult(iso: string, min = 19): boolean {
  const [y, m, d] = iso.split("-").map(Number);
  const limit = new Date(); limit.setHours(0, 0, 0, 0);
  limit.setFullYear(limit.getFullYear() - min);
  return new Date(y, m - 1, d) <= limit;
}
