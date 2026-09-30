"use client";
import { ReactNode } from "react";
import { COMMISSION, da } from "@/lib/format";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "ok" | "info"; children: ReactNode }) {
  const c = kind === "error" ? "bg-rose-50 text-rose-700 border-rose-200" : kind === "ok" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-violet-50 text-violet-700 border-violet-200";
  return <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${c}`}>{children}</div>;
}

export function Spinner() {
  return <div className="flex justify-center py-16"><div className="h-9 w-9 animate-spin rounded-full border-4 border-violet-200 border-t-brand-pink" /></div>;
}

export function Empty({ icon, title, text }: { icon: string; title: string; text?: string }) {
  return (
    <div className="card p-10 text-center">
      <div className="text-4xl">{icon}</div>
      <p className="mt-3 font-extrabold">{title}</p>
      {text && <p className="mt-1 text-sm text-slate-500">{text}</p>}
    </div>
  );
}

/** Détail prix : prix transporteur + commission Flixi = total à payer */
export function PriceBreakdown({ price, role }: { price: number; role: "client" | "driver" }) {
  const total = price + COMMISSION;
  return (
    <div className="rounded-2xl bg-gradient-to-br from-orange-50 via-pink-50 to-violet-50 p-4 text-sm">
      <Row k={role === "client" ? "Prix du transporteur" : "Votre prix (net)"} v={da(price)} />
      <Row k="Commission Flixi Tawsil" v={`+ ${da(COMMISSION)}`} />
      <div className="my-2 border-t border-violet-200" />
      {role === "client" ? (
        <Row k="Total à payer" v={da(total)} strong />
      ) : (
        <>
          <Row k="Prix à encaisser auprès du client" v={da(total)} strong />
          <p className="mt-1 text-xs text-slate-500">Dont {da(COMMISSION)} de commission à verser à Flixi Tawsil en fin de semaine.</p>
        </>
      )}
    </div>
  );
}
function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 py-0.5 ${strong ? "text-base font-extrabold" : ""}`}>
      <span className={strong ? "" : "text-slate-600"}>{k}</span>
      <span className={strong ? "grad-text text-lg" : "font-bold"}>{v}</span>
    </div>
  );
}
