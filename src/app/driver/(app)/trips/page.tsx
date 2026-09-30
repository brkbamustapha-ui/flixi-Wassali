"use client";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useSession } from "@/components/Session";
import { Alert, Empty, Field, Spinner } from "@/components/ui";
import { MIN_PRICE, da } from "@/lib/format";
import { WILAYAS } from "@/lib/wilayas";
import { useI18n } from "@/lib/i18n";

type Trip = { id: string; from_wilaya: string; to_wilaya: string; depart_date: string; depart_time: string; price: number | null; note: string | null; status: string };

export default function Trips() {
  const { sb, profile, driver } = useSession();
  const { t, w, date } = useI18n();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    const { data } = await sb.from("flixi_trips").select("*").order("depart_date", { ascending: false });
    setTrips((data as Trip[]) ?? []);
  }, [sb]);
  useEffect(() => { load(); }, [load]);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    const form = e.currentTarget;
    const f = new FormData(form);
    const price = f.get("price") ? Number(f.get("price")) : null;
    if (f.get("from") === f.get("to")) return setErr(t("Choisissez deux wilayas différentes."));
    if (price !== null && price < MIN_PRICE) return setErr(t("Le prix minimum est de {p}.", { p: da(MIN_PRICE) }));
    setBusy(true);
    const { error } = await sb.from("flixi_trips").insert({
      driver_id: profile.id, from_wilaya: String(f.get("from")), to_wilaya: String(f.get("to")),
      depart_date: String(f.get("date")), depart_time: String(f.get("time")), price, note: String(f.get("note") || "") || null,
    });
    setBusy(false);
    if (error) return setErr(t(error.message));
    form.reset();
    load();
  }

  if (!trips) return <Spinner />;
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <form onSubmit={add} className="card space-y-4 p-5 lg:col-span-2 lg:self-start">
        <h1 className="text-xl font-extrabold">{t("Annoncer un trajet")}</h1>
        <p className="text-sm text-slate-500">{t("Les clients voient votre trajet et peuvent vous envoyer leurs marchandises.")}</p>
        {driver?.approval !== "approved" && <Alert kind="info">{t("Disponible après l'approbation de votre dossier.")}</Alert>}
        <Field label={t("Wilaya de départ")}><select name="from" className="select">{WILAYAS.map((x) => <option key={x.code} value={x.name}>{w(x.name)}</option>)}</select></Field>
        <Field label={t("Wilaya de destination")}><select name="to" defaultValue="Oran" className="select">{WILAYAS.map((x) => <option key={x.code} value={x.name}>{w(x.name)}</option>)}</select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Jour de départ")}><input name="date" type="date" min={today} required className="input" /></Field>
          <Field label={t("Heure de départ")}><input name="time" type="time" required className="input" /></Field>
        </div>
        <Field label={t("Prix à partir de (DA, optionnel)")}><input name="price" type="number" min={MIN_PRICE} step={100} className="input" /></Field>
        <Field label={t("Note (capacité, type de marchandise…)")}><input name="note" className="input" /></Field>
        {err && <Alert>{err}</Alert>}
        <button disabled={busy || driver?.approval !== "approved"} className="btn btn-primary w-full">{t("Publier le trajet")}</button>
      </form>
      <div className="space-y-3 lg:col-span-3">
        <h2 className="text-xl font-extrabold">{t("Mes trajets")}</h2>
        {trips.length === 0 ? <Empty icon="🗓" title={t("Aucun trajet annoncé")} /> : trips.map((tr) => (
          <div key={tr.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-lg font-extrabold">{w(tr.from_wilaya)} <span className="grad-text inline-block rtl:rotate-180">→</span> {w(tr.to_wilaya)}</p>
              <p className="text-sm text-slate-600">🗓 {t("{d} à {h}", { d: date(tr.depart_date), h: tr.depart_time.slice(0, 5) })}{tr.price ? ` · ${t("dès {p}", { p: da(tr.price) })}` : ""}</p>
              {tr.note && <p className="text-xs text-slate-500">{tr.note}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className={`badge ${tr.status === "open" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{tr.status === "open" ? t("Ouvert") : t("Fermé")}</span>
              <button className="btn btn-ghost !py-1 text-xs" onClick={async () => { await sb.from("flixi_trips").update({ status: tr.status === "open" ? "closed" : "open" }).eq("id", tr.id); load(); }}>{tr.status === "open" ? t("Fermer") : t("Rouvrir")}</button>
              <button className="btn btn-danger !py-1 text-xs" onClick={async () => { await sb.from("flixi_trips").delete().eq("id", tr.id); load(); }}>{t("Supprimer")}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
