"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/components/Session";
import { Empty, Spinner } from "@/components/ui";
import { useNotifText, type Notif } from "@/lib/notifs";
import { useI18n } from "@/lib/i18n";

export default function NotificationsList({ role }: { role: "client" | "driver" }) {
  const { sb } = useSession();
  const { t, dateTime } = useI18n();
  const { text, href } = useNotifText(role);
  const [list, setList] = useState<Notif[] | null>(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      const { data } = await sb.rpc("flixi_notifs_all");
      if (dead) return;
      setList((data as Notif[]) ?? []);
      await sb.rpc("flixi_notifs_read_all");
      window.dispatchEvent(new Event("flixi:poll"));
    })();
    return () => { dead = true; };
  }, [sb]);

  if (!list) return <Spinner />;
  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <h1 className="text-2xl font-extrabold">🔔 {t("Notifications")}</h1>
      {list.length === 0 ? <Empty icon="🔕" title={t("Aucune notification")} /> : list.map((n) => {
        const h = href(n);
        const body = (
          <div className={`card flex items-start gap-3 p-4 ${n.read ? "" : "border-2 !border-brand-pink"}`}>
            <span className="text-xl">🔔</span>
            <div className="flex-1"><p className="text-sm font-bold">{text(n)}</p><p className="mt-0.5 text-xs text-slate-500">{dateTime(n.created_at)}</p></div>
          </div>
        );
        return h ? <Link key={n.id} href={h} className="block">{body}</Link> : <div key={n.id}>{body}</div>;
      })}
    </div>
  );
}
