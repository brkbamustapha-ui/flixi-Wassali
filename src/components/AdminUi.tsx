import { ReactNode } from "react";

export function Stat({ label, value, tone = "" }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="card p-5">
      <p className={`text-3xl font-extrabold ${tone || "grad-text"}`}>{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
    </div>
  );
}

export function Table({ heads, children, empty }: { heads: string[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-violet-50 text-xs font-extrabold uppercase tracking-wide text-slate-600">
          <tr>{heads.map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-violet-50">{children}</tbody>
      </table>
      {empty && <p className="p-8 text-center text-sm text-slate-500">Aucune donnée pour le moment.</p>}
    </div>
  );
}

export const Td = ({ children, className = "" }: { children: ReactNode; className?: string }) => <td className={`px-4 py-3 align-top ${className}`}>{children}</td>;

export function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
