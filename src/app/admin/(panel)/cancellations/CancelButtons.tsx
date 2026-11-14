"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resolveCancel } from "./actions";

export default function CancelButtons({ id, byClient, fee }: { id: string; byClient: boolean; fee: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [pending, start] = useTransition();
  function go(approve: boolean, withFee: boolean, label: string) {
    setMsg(null);
    start(async () => {
      const r = await resolveCancel(id, approve, withFee, note);
      setMsg({ ok: r.ok, t: r.ok ? `✔ ${label}` : r.error ?? "Erreur" });
      if (r.ok) router.refresh();
    });
  }
  return (
    <div className="flex flex-col gap-2">
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note pour les deux parties (facultative)" className="input !py-1.5 text-xs" />
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => go(true, false, "Course annulée sans frais.")} className="btn btn-primary !px-3 !py-1 text-xs">✔ Annuler sans frais</button>
        {byClient && <button type="button" disabled={pending} onClick={() => go(true, true, `Course annulée avec frais (${fee}).`)} className="btn btn-ok !px-3 !py-1 text-xs">💰 Annuler avec frais ({fee})</button>}
        <button type="button" disabled={pending} onClick={() => go(false, false, "Annulation rejetée : la course continue.")} className="btn btn-danger !px-3 !py-1 text-xs">✖ Rejeter : la course continue</button>
      </div>
      {pending && <p className="text-xs font-bold text-slate-500">Enregistrement…</p>}
      {msg && <p className={`text-xs font-bold ${msg.ok ? "text-emerald-700" : "text-rose-700"}`}>{msg.t}</p>}
    </div>
  );
}
