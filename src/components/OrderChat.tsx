"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Alert } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

type Msg = { id: string; body: string; created_at: string; mine: boolean };

/** Messagerie entre le client et le transporteur, ouverte dès que la commande est confirmée. */
export default function OrderChat({ sb, orderId, open }: { sb: SupabaseClient; orderId: string; open: boolean }) {
  const { t, dateTime } = useI18n();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const last = useRef(0);

  const load = useCallback(async () => {
    const { data } = await sb.rpc("flixi_order_messages", { p_order: orderId });
    const list = (data as Msg[]) ?? [];
    setMsgs(list);
    if (list.length !== last.current) { last.current = list.length; setTimeout(() => box.current?.scrollTo({ top: 99999, behavior: "smooth" }), 50); }
  }, [sb, orderId]);
  useEffect(() => { load(); const i = setInterval(load, 4000); window.addEventListener("flixi:poll", load); return () => { clearInterval(i); window.removeEventListener("flixi:poll", load); }; }, [load]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true); setErr("");
    const { error } = await sb.rpc("flixi_send_message", { p_order: orderId, p_body: text });
    setBusy(false);
    if (error) return setErr(t(error.message));
    setText("");
    load();
  }

  return (
    <div className="card space-y-3 p-5">
      <h2 className="text-lg font-extrabold">💬 {t("Messages")}</h2>
      <div ref={box} className="max-h-72 space-y-2 overflow-y-auto rounded-2xl bg-violet-50/60 p-3">
        {msgs.length === 0 && <p className="py-4 text-center text-sm text-slate-500">{t("Aucun message. Écrivez pour organiser le chargement.")}</p>}
        {msgs.map((m) => (
          <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.mine ? "grad-bg text-white" : "bg-white shadow-sm"}`}>
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className={`mt-0.5 text-[10px] ${m.mine ? "text-white/80" : "text-slate-400"}`}>{dateTime(m.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
      {err && <Alert>{err}</Alert>}
      {open ? (
        <form onSubmit={send} className="flex gap-2">
          <input className="input" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder={t("Votre message…")} />
          <button disabled={busy || !text.trim()} className="btn btn-primary">{t("Envoyer")}</button>
        </form>
      ) : <p className="text-xs text-slate-500">{t("La messagerie est fermée : la course est terminée.")}</p>}
    </div>
  );
}
