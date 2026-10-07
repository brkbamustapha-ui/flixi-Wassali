"use client";
import { useEffect, useState } from "react";
import { useSession } from "@/components/Session";
import { Alert, Empty, Spinner } from "@/components/ui";
import { PAY_METHODS, da } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

type Com = { id: string; order_id: string; amount: number; status: "unpaid" | "paid" | "cancelled"; method: string | null; paid_at: string | null; created_at: string };

function weekStart(d: string) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function Commissions() {
  const { sb } = useSession();
  const { t, date } = useI18n();
  const [rows, setRows] = useState<Com[] | null>(null);
  useEffect(() => { sb.from("flixi_commissions").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(((data as Com[]) ?? []).filter((r) => r.status !== "cancelled"))); }, [sb]);
  if (!rows) return <Spinner />;

  const unpaid = rows.filter((r) => r.status === "unpaid");
  const total = unpaid.reduce((s, r) => s + r.amount, 0);
  const weeks = new Map<string, Com[]>();
  rows.forEach((r) => { const k = weekStart(r.created_at).toISOString(); weeks.set(k, [...(weeks.get(k) ?? []), r]); });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold">{t("Commissions Flixi Tawsil")}</h1>
      <div className="grad-bg rounded-3xl p-6 text-white shadow-lg">
        <p className="text-sm font-bold opacity-90">{t("Total à verser")}</p>
        <p className="mt-1 text-4xl font-extrabold">{da(total)}</p>
        <p className="mt-2 text-sm text-white/90">{t(unpaid.length > 1 ? "{n} courses (8 à 12 % du prix de chaque course)" : "{n} course (8 à 12 % du prix de la course)", { n: unpaid.length })}</p>
      </div>
      <Alert kind="info">💳 {t("Chaque samedi, rendez-vous à nos bureaux pour verser vos commissions par Edahabia, CIB, Visa ou Mastercard. Votre compte sera mis à jour par l'équipe.")}</Alert>
      {rows.length === 0 ? <Empty icon="💳" title={t("Aucune commission")} text={t("Une commission (12 % sous 5 000 DA, 10 % de 5 000 à 8 000 DA, 8 % au-delà) est ajoutée à chaque course conclue.")} /> : (
        [...weeks.entries()].map(([k, list]) => {
          const start = new Date(k), end = new Date(start); end.setDate(end.getDate() + 6);
          const due = list.filter((r) => r.status === "unpaid").reduce((s, r) => s + r.amount, 0);
          return (
            <div key={k} className="card overflow-hidden">
              <div className="flex items-center justify-between bg-violet-50 px-5 py-3 text-sm font-extrabold">
                <span>{t("Semaine du {a} au {b}", { a: date(start.toISOString()), b: date(end.toISOString()) })}</span>
                <span className={due ? "text-brand-pink" : "text-emerald-600"}>{due ? t("{p} à verser", { p: da(due) }) : t("Soldée ✔")}</span>
              </div>
              {list.map((r) => (
                <div key={r.id} className="flex items-center justify-between border-t border-violet-50 px-5 py-3 text-sm">
                  <span>{t("Course du {d}", { d: date(r.created_at) })}</span>
                  <span className="flex items-center gap-3">
                    <b>{da(r.amount)}</b>
                    {r.status === "paid" ? <span className="badge bg-emerald-100 text-emerald-700">{t("Payée")} · {t(PAY_METHODS[r.method ?? ""] ?? "")}</span> : <span className="badge bg-amber-100 text-amber-800">{t("À payer")}</span>}
                  </span>
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
