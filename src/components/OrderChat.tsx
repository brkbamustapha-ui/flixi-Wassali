"use client";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { useI18n } from "@/lib/i18n";

type Msg = { id: string; body: string; created_at: string; mine: boolean; read: boolean };
const GAP_MS = 5 * 60 * 1000;

/** Fil de discussion façon Messenger : bulles arrondies regroupées, accusé « Vu », envoi rapide 👍. */
export function ChatThread({ sb, orderId, open, other, className = "" }: { sb: SupabaseClient; orderId: string; open: boolean; other: string; className?: string }) {
  const { t, dateTime } = useI18n();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const lastCount = useRef(-1);

  const load = useCallback(async () => {
    const { data } = await sb.rpc("flixi_order_messages", { p_order: orderId });
    const list = (data as Msg[]) ?? [];
    setMsgs(list);
    if (list.some((m) => !m.mine && !m.read)) { sb.rpc("flixi_mark_messages_read", { p_order: orderId }); window.dispatchEvent(new Event("flixi:chat-read")); }
    if (list.length !== lastCount.current) {
      const first = lastCount.current === -1;
      lastCount.current = list.length;
      setTimeout(() => box.current?.scrollTo({ top: 999999, behavior: first ? "auto" : "smooth" }), 40);
    }
  }, [sb, orderId]);
  useEffect(() => {
    load();
    const i = setInterval(load, 3000);
    window.addEventListener("flixi:poll", load);
    return () => { clearInterval(i); window.removeEventListener("flixi:poll", load); };
  }, [load]);

  async function post(body: string) {
    if (!body.trim() || busy) return;
    setBusy(true); setErr("");
    // affichage immédiat (comme Messenger), confirmé au prochain rafraîchissement
    setMsgs((m) => [...m, { id: `tmp-${Date.now()}`, body: body.trim(), created_at: new Date().toISOString(), mine: true, read: false }]);
    setTimeout(() => box.current?.scrollTo({ top: 999999, behavior: "smooth" }), 40);
    const { error } = await sb.rpc("flixi_send_message", { p_order: orderId, p_body: body });
    setBusy(false);
    if (error) setErr(t(error.message));
    load();
  }
  function submit(e: FormEvent) { e.preventDefault(); const b = text; setText(""); post(b); }

  const lastMine = [...msgs].reverse().find((m) => m.mine);
  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div ref={box} className="flex-1 space-y-0.5 overflow-y-auto bg-white px-3 py-3">
        {msgs.length === 0 && <p className="py-10 text-center text-sm text-slate-400">{t("Aucun message. Écrivez pour organiser le chargement.")}</p>}
        <AnimatePresence initial={false}>
          {msgs.map((m, i) => {
            const prev = msgs[i - 1], next = msgs[i + 1];
            const sameAsPrev = prev && prev.mine === m.mine && new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < GAP_MS;
            const sameAsNext = next && next.mine === m.mine && new Date(next.created_at).getTime() - new Date(m.created_at).getTime() < GAP_MS;
            const showTime = !prev || new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() > 30 * 60 * 1000;
            // coins arrondis façon Messenger : le côté « queue » se resserre à l'intérieur d'un groupe
            const tail = m.mine ? `${sameAsPrev ? "rounded-te-md" : ""} ${sameAsNext ? "rounded-be-md" : ""}` : `${sameAsPrev ? "rounded-ts-md" : ""} ${sameAsNext ? "rounded-bs-md" : ""}`;
            return (
              <div key={m.id}>
                {showTime && <p className="my-2 text-center text-[11px] font-semibold text-slate-400">{dateTime(m.created_at)}</p>}
                <motion.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.18 }}
                  className={`flex items-end gap-1.5 ${m.mine ? "justify-end" : "justify-start"} ${sameAsPrev ? "mt-0.5" : "mt-2"}`}>
                  {!m.mine && <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[11px] font-extrabold text-violet-700 ${sameAsNext ? "invisible" : ""}`}>{other.slice(0, 1)}</span>}
                  <div title={dateTime(m.created_at)}
                    className={`max-w-[78%] whitespace-pre-wrap break-words rounded-3xl px-3.5 py-2 text-[15px] leading-snug ${m.mine ? "grad-bg text-white" : "bg-slate-100 text-slate-900"} ${tail} ${m.body === "👍" ? "!bg-transparent !px-0 !py-0 text-4xl" : ""}`}>
                    {m.body}
                  </div>
                </motion.div>
                {m.id === lastMine?.id && <p className="mt-0.5 pe-1 text-end text-[11px] font-semibold text-slate-400">{m.id.startsWith("tmp-") ? t("Envoi…") : m.read ? `✓✓ ${t("Vu")}` : `✓ ${t("Envoyé")}`}</p>}
              </div>
            );
          })}
        </AnimatePresence>
      </div>
      {err && <p className="bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700">{err}</p>}
      {open ? (
        <form onSubmit={submit} className="flex items-center gap-2 border-t border-slate-100 bg-white p-2.5">
          <input className="flex-1 rounded-full bg-slate-100 px-4 py-2.5 text-[15px] outline-none focus:ring-2 focus:ring-brand-pink/40" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder={t("Aa")} aria-label={t("Votre message…")} />
          {text.trim()
            ? <button className="flex h-10 w-10 items-center justify-center rounded-full grad-bg text-lg text-white shadow" aria-label={t("Envoyer")}>➤</button>
            : <button type="button" onClick={() => post("👍")} className="flex h-10 w-10 items-center justify-center rounded-full text-2xl" aria-label="👍">👍</button>}
        </form>
      ) : <p className="border-t border-slate-100 bg-white p-3 text-center text-xs text-slate-500">{t("La messagerie est fermée : la course est terminée.")}</p>}
    </div>
  );
}

/** Bulle de discussion flottante (comme Messenger) : ouvre la conversation dans une fenêtre, avec compteur de messages non lus. */
export default function ChatHead({ sb, orderId, open, refLabel, other }: { sb: SupabaseClient; orderId: string; open: boolean; refLabel?: string; other: "client" | "driver" }) {
  const { t } = useI18n();
  const [show, setShow] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const load = () => sb.rpc("flixi_unread_messages", { p_order: orderId }).then(({ data }) => typeof data === "number" && setUnread(data));
    load();
    const i = setInterval(load, 5000);
    window.addEventListener("flixi:chat-read", load);
    const openIt = () => setShow(true);
    window.addEventListener("flixi:chat-open", openIt);
    return () => { clearInterval(i); window.removeEventListener("flixi:chat-read", load); window.removeEventListener("flixi:chat-open", openIt); };
  }, [sb, orderId]);

  const label = other === "client" ? t("Client") : t("Transporteur");
  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 24, scale: 0.96 }} transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed inset-x-2 bottom-20 z-[80] flex h-[min(72vh,560px)] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/10 sm:inset-x-auto sm:end-4 sm:w-[380px] md:bottom-4">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-sm font-extrabold text-violet-700">{label.slice(0, 1)}</span>
              <div className="flex-1"><p className="font-extrabold leading-tight">{label}</p><p className="text-xs text-slate-500">{refLabel ?? ""}</p></div>
              <button onClick={() => setShow(false)} aria-label={t("Fermer")} className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">✕</button>
            </div>
            <ChatThread sb={sb} orderId={orderId} open={open} other={label} className="flex-1" />
          </motion.div>
        )}
      </AnimatePresence>
      {!show && (
        <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.92 }} onClick={() => setShow(true)} aria-label={t("Messages")}
          className="fixed bottom-20 end-4 z-[70] flex h-14 w-14 items-center justify-center rounded-full grad-bg text-2xl text-white shadow-xl md:bottom-6">
          💬
          {unread > 0 && <span className="absolute -end-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-600 px-1 text-xs font-extrabold ring-2 ring-white">{unread > 9 ? "9+" : unread}</span>}
        </motion.button>
      )}
    </>
  );
}

/** Carte de la page de commande qui ouvre la discussion. */
export function ChatLauncher() {
  const { t } = useI18n();
  return (
    <button onClick={() => window.dispatchEvent(new Event("flixi:chat-open"))} className="card flex w-full items-center gap-3 p-4 text-start transition hover:-translate-y-0.5">
      <span className="flex h-12 w-12 items-center justify-center rounded-full grad-bg text-2xl text-white">💬</span>
      <span><b className="block">{t("Messages")}</b><span className="text-sm text-slate-500">{t("Ouvrir la discussion")}</span></span>
    </button>
  );
}
