"use client";
import { useEffect, useState } from "react";
import { Field } from "@/components/ui";
import { loadCommunes, type Commune } from "@/lib/geo";
import { useI18n } from "@/lib/i18n";

/** Liste des communes de la wilaya choisie (obligatoire). */
export default function CommunePicker({ code, value, onChange, label, onList, optional }: { code: number; value: string; onChange: (c: string) => void; label: string; onList?: (l: Commune[]) => void; optional?: boolean }) {
  const { lang, t } = useI18n();
  const [list, setList] = useState<Commune[]>([]);
  useEffect(() => {
    let dead = false;
    loadCommunes(code).then((l) => { if (!dead) { setList(l); onList?.(l); } }).catch(() => {});
    return () => { dead = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);
  return (
    <Field label={optional ? `${label} (${t("optionnel")})` : label}>
      <select className="select" required={!optional} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled={!optional}>{optional ? t("Toute la wilaya (non précisée)") : t("Choisir la commune")}</option>
        {list.map((c) => <option key={c[0]} value={c[0]}>{lang === "ar" || lang === "dz" ? c[1] : c[0]}</option>)}
      </select>
    </Field>
  );
}
