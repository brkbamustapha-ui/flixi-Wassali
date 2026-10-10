"use client";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Alert } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

type R = { mine: { stars: number; comment: string | null } | null; theirs: { stars: number; comment: string | null } | null };

export const Stars = ({ value, size = "text-base" }: { value: number; size?: string }) => (
  <span className={`${size} text-amber-500`} aria-label={`${value}/5`}>{"★".repeat(Math.round(value))}<span className="text-slate-300">{"★".repeat(5 - Math.round(value))}</span></span>
);

/** Notation par étoiles + avis, dans les deux sens (client ↔ transporteur), une fois la course livrée. */
export default function RatePanel({ sb, orderId, who }: { sb: SupabaseClient; orderId: string; who: "client" | "driver" }) {
  const { t } = useI18n();
  const [r, setR] = useState<R | null>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => sb.rpc("flixi_order_ratings", { p_order: orderId }).then(({ data }) => setR(data as R));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function send() {
    setBusy(true); setErr("");
    const { error } = await sb.rpc("flixi_rate_order", { p_order: orderId, p_stars: stars, p_comment: comment });
    setBusy(false);
    if (error) return setErr(t(error.message));
    load();
  }
  if (!r) return null;
  const target = who === "client" ? t("le transporteur") : t("le client");
  return (
    <div className="card space-y-3 p-5">
      <h2 className="text-lg font-extrabold">⭐ {t("Notation")}</h2>
      {r.mine ? (
        <p className="text-sm">{t("Votre note pour {x} :", { x: target })} <Stars value={r.mine.stars} />{r.mine.comment ? ` — « ${r.mine.comment} »` : ""}</p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-bold">{t("Notez {x} :", { x: target })}</p>
          <div className="flex gap-1 text-3xl">
            {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" onClick={() => setStars(n)} aria-label={`${n}`} className={n <= stars ? "text-amber-500" : "text-slate-300"}>★</button>)}
          </div>
          <textarea className="textarea" rows={2} maxLength={300} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("Votre avis (facultatif)")} />
          {err && <Alert>{err}</Alert>}
          <button disabled={busy || !stars} onClick={send} className="btn btn-primary text-sm">{t("Envoyer ma note")}</button>
        </div>
      )}
      {r.theirs && <p className="text-sm">{t("Note reçue :")} <Stars value={r.theirs.stars} />{r.theirs.comment ? ` — « ${r.theirs.comment} »` : ""}</p>}
    </div>
  );
}
