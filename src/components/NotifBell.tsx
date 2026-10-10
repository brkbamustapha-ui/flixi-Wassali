"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Cloche des notifications avec compteur de non lues. */
export default function NotifBell({ sb, role }: { sb: SupabaseClient; role: "client" | "driver" }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const load = () => sb.rpc("flixi_notifs_unread").then(({ data }) => typeof data === "number" && setN(data));
    load();
    const i = setInterval(load, 12000);
    window.addEventListener("flixi:poll", load);
    return () => { clearInterval(i); window.removeEventListener("flixi:poll", load); };
  }, [sb]);
  return (
    <Link href={`/${role}/notifications`} aria-label="Notifications" className="relative flex h-9 w-9 items-center justify-center rounded-full bg-violet-50 text-lg">
      🔔
      {n > 0 && <span className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-pink px-1 text-[11px] font-extrabold text-white">{n > 9 ? "9+" : n}</span>}
    </Link>
  );
}
