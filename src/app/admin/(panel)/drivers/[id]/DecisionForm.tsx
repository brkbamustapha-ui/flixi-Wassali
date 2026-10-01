"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideDriver } from "./actions";

const DONE: Record<string, string> = { approved: "✔ Transporteur approuvé.", rejected: "Dossier refusé.", pending: "Remis « à valider »." };

export default function DecisionForm({ id, note: initial }: { id: string; note: string }) {
  const router = useRouter();
  const [note, setNote] = useState(initial);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pending, start] = useTransition();

  function decide(approval: string) {
    setMsg(null);
    start(async () => {
      const r = await decideDriver(id, approval, note);
      setMsg({ ok: r.ok, t: r.ok ? DONE[approval] : r.error ?? "Erreur" });
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="card space-y-3 p-6">
      <h2 className="text-lg font-extrabold">Décision</h2>
      <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note interne / motif de refus (visible par le transporteur)" className="textarea" rows={2} />
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => decide("approved")} className="btn btn-ok">✔ Approuver</button>
        <button type="button" disabled={pending} onClick={() => decide("rejected")} className="btn btn-danger">✖ Refuser</button>
        <button type="button" disabled={pending} onClick={() => decide("pending")} className="btn btn-ghost">Remettre à valider</button>
      </div>
      {pending && <p className="text-sm font-bold text-slate-500">Enregistrement…</p>}
      {msg && <p className={`rounded-xl border px-4 py-2 text-sm font-bold ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-rose-200 bg-rose-50 text-rose-700"}`}>{msg.t}</p>}
    </div>
  );
}
