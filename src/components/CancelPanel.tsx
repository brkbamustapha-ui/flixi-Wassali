"use client";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Alert } from "@/components/ui";
import PhotoPicker from "@/components/PhotoPicker";
import { Gallery } from "@/components/OrderDetails";
import { cancelFee, da } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Order } from "@/lib/supabase";

type Proofs = { by: "client" | "driver"; reason: string | null; imgs: string[]; refusal_reason: string | null; refusal_imgs: string[] };

/** Justificatifs (message + photos) de la demande d'annulation et, le cas échéant, du refus. Visibles par les deux parties. */
export function ProofsView({ sb, orderId, version }: { sb: SupabaseClient; orderId: string; version: string }) {
  const { t } = useI18n();
  const [p, setP] = useState<Proofs | null>(null);
  useEffect(() => { sb.rpc("flixi_cancel_proofs", { p_order: orderId }).then(({ data }) => setP((data as Proofs) ?? null)); }, [sb, orderId, version]);
  if (!p) return null;
  const who = (x: "client" | "driver") => (x === "driver" ? t("le transporteur") : t("le client"));
  return (
    <div className="space-y-2 text-sm">
      {p.imgs?.length > 0 && <div><p className="font-bold">📎 {t("Justificatifs de {who}", { who: who(p.by) })}</p><Gallery imgs={p.imgs} /></div>}
      {p.refusal_reason && (
        <div className="rounded-xl bg-white p-2">
          <p className="font-bold">✖ {t("Motif du refus de {who} : {r}", { who: who(p.by === "client" ? "driver" : "client"), r: p.refusal_reason })}</p>
          {p.refusal_imgs?.length > 0 && <Gallery imgs={p.refusal_imgs} />}
        </div>
      )}
    </div>
  );
}

/** Formulaire message + photos (justificatifs). */
export function ProofForm({ message, onMessage, photos, onPhotos, label, onError }: { message: string; onMessage: (v: string) => void; photos: string[]; onPhotos: (p: string[]) => void; label: string; onError?: (m: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      <textarea className="textarea" rows={2} value={message} onChange={(e) => onMessage(e.target.value)} placeholder={label} />
      <PhotoPicker photos={photos} onChange={onPhotos} onError={onError} max={4} title={t("Justificatifs (photos, captures de messages…)")} hint={t("Ajoutez des photos ou des captures de messages qui prouvent votre motif : l'autre partie et l'administration les voient.")} />
    </div>
  );
}

/** Toute la logique d'annulation d'une course acceptée, pour le client ET le transporteur :
 *  demande (motif + justificatifs) -> l'autre partie ET l'administration sont prévenues en même temps -> l'autre partie accepte (fin, sans l'administration)
 *  ou refuse (litige : l'administration tranche). Tant qu'une demande est en cours, la course est bloquée. */
export default function CancelPanel({ role, order, sb, onChanged }: { role: "client" | "driver"; order: Order; sb: SupabaseClient; onChanged: () => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [refuse, setRefuse] = useState(false);
  const [reason, setReason] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [fee, setFee] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  if (order.status !== "matched") return null;
  const price = order.final_price ?? order.client_price;
  const feeAmount = cancelFee(price);
  const requested = order.cancel_status === "requested";
  const dispute = requested && !!(order as Order & { cancel_dispute?: boolean }).cancel_dispute;
  const mine = requested && order.cancel_by === role;
  const version = `${order.cancel_status}|${dispute}|${order.cancel_reason}`;

  async function call(fn: string, args: Record<string, unknown>) {
    setBusy(true); setErr("");
    const { error } = await sb.rpc(fn, args);
    setBusy(false);
    if (error) return setErr(t(error.message));
    setOpen(false); setRefuse(false); setReason(""); setPhotos([]);
    onChanged();
    window.dispatchEvent(new Event("flixi:poll"));
  }

  // 1) Litige : l'administration tranche
  if (dispute) {
    return (
      <div className="space-y-3 rounded-2xl border-2 border-rose-300 bg-rose-50 p-4 text-sm">
        <p className="font-extrabold text-rose-800">⚖ {t("Litige sur l'annulation : l'administration va trancher.")}</p>
        <p className="text-rose-900">{t("La course est bloquée en attendant sa décision. Motif de la demande : {r}", { r: order.cancel_reason ?? "—" })}</p>
        <ProofsView sb={sb} orderId={order.id} version={version} />
      </div>
    );
  }
  // 2) Ma demande est en attente de l'autre partie
  if (mine) {
    return (
      <div className="space-y-2 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm">
        <p className="font-extrabold">⏳ {t("Votre demande d'annulation est envoyée à {who} et à l'administration.", { who: role === "client" ? t("au transporteur") : t("au client") })}</p>
        <p>{t("Si {who} accepte, la course est annulée sans autre démarche. S'il refuse, l'administration tranche. La course est bloquée en attendant.", { who: role === "client" ? t("le transporteur") : t("le client") })}</p>
        <ProofsView sb={sb} orderId={order.id} version={version} />
      </div>
    );
  }
  // 3) Demande reçue de l'autre partie : je réponds
  if (requested) {
    const fromClient = order.cancel_by === "client";
    return (
      <div className="space-y-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-sm">
        <p className="font-extrabold">⚠ {fromClient ? t("Le client demande l'annulation de la course.") : t("Le transporteur demande l'annulation de la course.")}</p>
        <p>{t("Motif : {r}", { r: order.cancel_reason ?? "" })}</p>
        <ProofsView sb={sb} orderId={order.id} version={version} />
        <p className="text-xs font-semibold text-slate-600">{t("L'administration est informée en même temps. Si vous acceptez, c'est terminé sans elle ; si vous refusez, elle tranchera. La course est bloquée en attendant.")}</p>
        {err && <Alert>{err}</Alert>}
        {!refuse ? (
          <>
            {role === "driver" && fromClient && (
              <div className="space-y-1 rounded-xl bg-white p-3">
                <p className="font-bold">{t("Pouvez-vous annuler gratuitement ou avec des frais ?")}</p>
                <label className="flex items-center gap-2"><input type="radio" name="fee" checked={!fee} onChange={() => setFee(false)} className="accent-pink-600" /> {t("Annulation gratuite")}</label>
                <label className="flex items-center gap-2"><input type="radio" name="fee" checked={fee} onChange={() => setFee(true)} className="accent-pink-600" /> {t("Annulation avec frais : {f} (5 % sous 10 000 DA, 1 000 DA au-delà), réglés directement par le client — la plateforme ne touche rien.", { f: da(feeAmount) })}</label>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button disabled={busy} onClick={() => call("flixi_answer_cancel3", { p_order: order.id, p_accept: true, p_with_fee: role === "driver" && fromClient && fee, p_reason: null, p_imgs: [] })} className="btn btn-primary !py-1.5 text-sm">✔ {t("Accepter l'annulation")}</button>
              <button disabled={busy} onClick={() => setRefuse(true)} className="btn btn-danger !py-1.5 text-sm">✖ {t("Refuser")}</button>
            </div>
          </>
        ) : (
          <div className="space-y-2 rounded-xl bg-white p-3">
            <p className="font-bold">{t("Pourquoi refusez-vous ? Le litige sera tranché par l'administration.")}</p>
            <ProofForm message={reason} onMessage={setReason} photos={photos} onPhotos={setPhotos} label={t("Motif du refus (obligatoire)")} onError={setErr} />
            <div className="flex gap-2">
              <button disabled={busy || reason.trim().length < 5} onClick={() => call("flixi_answer_cancel3", { p_order: order.id, p_accept: false, p_with_fee: false, p_reason: reason, p_imgs: photos })} className="btn btn-danger !py-1.5 text-sm">{t("Envoyer le refus")}</button>
              <button onClick={() => setRefuse(false)} className="btn btn-ghost !py-1.5 text-sm">{t("Retour")}</button>
            </div>
          </div>
        )}
      </div>
    );
  }
  // 4) Pas de demande : le client peut en faire une (le transporteur passe par « Un problème avec cette course ? »)
  if (role !== "client") return order.cancel_status === "refused" ? <Alert>{order.cancel_admin_ok === false ? t("L'administration a refusé l'annulation : la course continue.") + (order.cancel_admin_note ? ` ${order.cancel_admin_note}` : "") : t("L'annulation a été refusée.")}</Alert> : null;
  return (
    <div className="space-y-2">
      {order.cancel_status === "refused" && <Alert>{order.cancel_admin_ok === false ? t("L'administration a refusé l'annulation : la course continue.") + (order.cancel_admin_note ? ` ${order.cancel_admin_note}` : "") : t("L'annulation a été refusée.")}</Alert>}
      {!open ? (
        <button onClick={() => setOpen(true)} className="btn btn-danger !py-1.5 text-sm">{t("Demander l'annulation")}</button>
      ) : (
        <div className="space-y-2 rounded-xl border-2 border-rose-200 bg-rose-50/60 p-3 text-sm">
          <p className="font-bold">{t("Le transporteur et l'administration sont prévenus en même temps. S'il accepte, la course est annulée ; s'il refuse, l'administration tranche. Le motif est obligatoire.")}</p>
          <p className="text-xs font-semibold text-slate-600">{t("Le transporteur peut annuler gratuitement ou avec des frais de {f} (5 % sous 10 000 DA, 1 000 DA au-delà) que vous lui réglez directement.", { f: da(feeAmount) })}</p>
          {err && <Alert>{err}</Alert>}
          <ProofForm message={reason} onMessage={setReason} photos={photos} onPhotos={setPhotos} label={t("Motif de l'annulation (obligatoire)")} onError={setErr} />
          <div className="flex gap-2">
            <button disabled={busy || reason.trim().length < 5} onClick={() => call("flixi_client_cancel", { p_order: order.id, p_reason: reason, p_imgs: photos })} className="btn btn-danger !py-1.5 text-sm">{t("Envoyer la demande")}</button>
            <button onClick={() => setOpen(false)} className="btn btn-ghost !py-1.5 text-sm">{t("Annuler")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
