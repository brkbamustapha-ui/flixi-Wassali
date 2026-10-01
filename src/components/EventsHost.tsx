"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "motion/react";
import type { SupabaseClient } from "@supabase/supabase-js";
import Celebration, { CelebEvent } from "./Celebration";

const SEEN_KEY = "flixi_seen_events";
const readSeen = (): string[] => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]"); } catch { return []; } };
const writeSeen = (a: string[]) => { try { localStorage.setItem(SEEN_KEY, JSON.stringify(a.slice(-300))); } catch {} };

/** Écoute les évènements d'enchères (fin d'enchère, gagnant, affaire conclue), affiche les félicitations,
 *  signale la présence « en ligne » et enregistre l'adresse IP côté serveur (sécurité). */
export default function EventsHost({ sb, role }: { sb: SupabaseClient; role: "client" | "driver" }) {
  const router = useRouter();
  const [queue, setQueue] = useState<CelebEvent[]>([]);
  const shown = useRef<Set<string>>(new Set());

  const poll = useCallback(async () => {
    const { data } = await sb.rpc("flixi_my_events");
    const seen = new Set(readSeen());
    const fresh = ((data as CelebEvent[]) ?? []).filter((e) => !seen.has(e.key) && !shown.current.has(e.key));
    if (fresh.length) { fresh.forEach((e) => shown.current.add(e.key)); setQueue((q) => [...q, ...fresh]); }
  }, [sb]);

  useEffect(() => {
    poll();
    const i = setInterval(poll, 6000);
    const now = () => poll();
    window.addEventListener("flixi:poll", now);
    return () => { clearInterval(i); window.removeEventListener("flixi:poll", now); };
  }, [poll]);

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

  return <AnimatePresence>{ev && <Celebration key={ev.key} ev={ev} onClose={close} onGo={go} />}</AnimatePresence>;
}
