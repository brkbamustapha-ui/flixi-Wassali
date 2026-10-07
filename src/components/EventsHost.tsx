"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import Celebration, { CelebEvent } from "./Celebration";
import { useI18n } from "@/lib/i18n";
import { da } from "@/lib/format";

type Notif = { id: string; kind: string; params: { from?: string; to?: string; price?: number; by?: string; count?: number; accepted?: boolean; order?: string } };

/** Petit « ding » généré par le navigateur (aucun fichier audio nécessaire). */
function beep() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    [880, 1318].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
      const t0 = ctx.currentTime + i * 0.14;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);
      o.start(t0); o.stop(t0 + 0.4);
    });
    setTimeout(() => ctx.close(), 900);
  } catch {}
}

const SEEN_KEY = "flixi_seen_events";
const readSeen = (): string[] => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]"); } catch { return []; } };
const writeSeen = (a: string[]) => { try { localStorage.setItem(SEEN_KEY, JSON.stringify(a.slice(-300))); } catch {} };

/** Écoute les évènements d'enchères (fin d'enchère, gagnant, affaire conclue), affiche les félicitations,
 *  signale la présence « en ligne » et enregistre l'adresse IP côté serveur (sécurité). */
export default function EventsHost({ sb, role }: { sb: SupabaseClient; role: "client" | "driver" }) {
  const router = useRouter();
  const [queue, setQueue] = useState<CelebEvent[]>([]);
  const shown = useRef<Set<string>>(new Set());
  const { t, w } = useI18n();
  const [toasts, setToasts] = useState<{ id: string; text: string; href?: string }[]>([]);

  const text = useCallback((n: Notif) => {
    const r = n.params.from && n.params.to ? `${w(n.params.from)} → ${w(n.params.to)}` : "";
    switch (n.kind) {
      case "new_bid": return t("Nouvelle offre de {p} sur votre commande {r}", { p: da(n.params.price), r });
      case "new_trip_bid": return t("Nouvelle offre de {p} sur votre trajet {r}", { p: da(n.params.price), r });
      case "deal": return t("Affaire conclue {r} pour {p}", { p: da(n.params.price), r });
      case "cancel_request": return t("Demande d'annulation reçue pour {r}", { r });
      case "cancel_answer": return n.params.accepted ? t("Votre demande d'annulation a été acceptée ({r})", { r }) : t("Votre demande d'annulation a été refusée ({r})", { r });
      case "cancelled": return t("Course annulée par {who} ({r})", { who: n.params.by === "driver" ? t("le transporteur") : t("le client"), r });
      case "warning": return t("Avertissement {n}/2 : au bout de 2 avertissements votre compte est banni.", { n: n.params.count ?? 1 });
      default: return t("Nouvelle notification");
    }
  }, [t, w]);

  const pollNotifs = useCallback(async () => {
    const { data } = await sb.rpc("flixi_my_notifs");
    const list = (data as Notif[]) ?? [];
    if (!list.length) return;
    await sb.rpc("flixi_notifs_seen");
    setToasts((q) => [...q, ...list.map((n) => ({ id: n.id, text: text(n), href: n.params.order ? `/client/orders/${n.params.order}` : undefined }))].slice(-4));
    beep();
    list.forEach((n) => setTimeout(() => setToasts((q) => q.filter((x) => x.id !== n.id)), 9000));
  }, [sb, text]);

  const poll = useCallback(async () => {
    const { data } = await sb.rpc("flixi_my_events");
    const seen = new Set(readSeen());
    const fresh = ((data as CelebEvent[]) ?? []).filter((e) => !seen.has(e.key) && !shown.current.has(e.key));
    if (fresh.length) { fresh.forEach((e) => shown.current.add(e.key)); setQueue((q) => [...q, ...fresh]); }
  }, [sb]);

  useEffect(() => {
    poll(); pollNotifs();
    const i = setInterval(() => { poll(); pollNotifs(); }, 6000);
    const now = () => { poll(); pollNotifs(); };
    window.addEventListener("flixi:poll", now);
    return () => { clearInterval(i); window.removeEventListener("flixi:poll", now); };
  }, [poll, pollNotifs]);

  // présence en ligne
  useEffect(() => {
    const ping = () => { if (document.visibilityState === "visible") sb.rpc("flixi_ping"); };
    ping();
    const i = setInterval(ping, 60000);
    document.addEventListener("visibilitychange", ping);
    return () => { clearInterval(i); document.removeEventListener("visibilitychange", ping); };
  }, [sb]);

  // enregistrement de l'adresse IP (une fois toutes les 30 minutes)
  useEffect(() => {
    (async () => {
      try {
        const last = Number(sessionStorage.getItem("flixi_ip_ts") ?? 0);
        if (Date.now() - last < 30 * 60 * 1000) return;
        const { data } = await sb.auth.getSession();
        if (!data.session) return;
        sessionStorage.setItem("flixi_ip_ts", String(Date.now()));
        await fetch("/api/track", { method: "POST", headers: { Authorization: `Bearer ${data.session.access_token}` } });
      } catch {}
    })();
  }, [sb]);

  const ev = queue[0];
  const close = () => { if (!ev) return; writeSeen([...readSeen(), ev.key]); setQueue((q) => q.slice(1)); };
  const go = () => {
    if (!ev) return;
    close();
    if (ev.kind === "deal") router.push(`/${role}/orders/${ev.id}`);
    else if (ev.kind === "ended") router.push(ev.role === "client" ? `/client/orders/${ev.id}` : "/driver/trips");
    else router.push(ev.role === "client" ? "/client/trips" : "/driver");
  };

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3" aria-live="polite">
        {toasts.map((x) => (
          <button key={x.id} type="button" onClick={() => { setToasts((q) => q.filter((y) => y.id !== x.id)); if (x.href) router.push(x.href); }}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-2xl border border-violet-100 bg-white px-4 py-3 text-start text-sm font-bold shadow-xl">
            <span className="text-lg">🔔</span><span>{x.text}</span>
          </button>
        ))}
      </div>
      <AnimatePresence>{ev && <Celebration key={ev.key} ev={ev} onClose={close} onGo={go} />}</AnimatePresence>
    </>
  );
}
