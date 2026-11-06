"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideCancel } from "./actions";

export default function CancelButtons({ id }: { id: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pending, start] = useTransition();
  function go(approve: boolean) {
    setMsg(null);
    start(async () => {
      const r = await decideCancel(id, approve, note);
      setMsg({ ok: r.ok, t: r.ok ? (approve ? "✔ Validée : l'autre partie doit maintenant accepter." : "Demande refusée.") : r.error ?? "Erreur" });
      if (r.ok) router.refresh();
    });
  }
  return (
    <div className="flex flex-col gap-2">
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (facultative)" className="input !py-1.5 text-xs" />
      <div className="flex gap-2">
        <button type="button" disabled={pending} onClick={() => go(true)} className="btn btn-primary !px-3 !py-1 text-xs">✔ Valider</button>
        <button type="button" disabled={pending} onClick={() => go(false)} className="btn btn-danger !px-3 !py-1 text-xs">✖ Refuser</button>
      </div>
      {pending && <p className="text-xs font-bold text-slate-500">Enregistrement…</p>}
      {msg && <p className={`text-xs font-bold ${msg.ok ? "text-emerald-700" : "text-rose-700"}`}>{msg.t}</p>}
    </div>
  );
}
