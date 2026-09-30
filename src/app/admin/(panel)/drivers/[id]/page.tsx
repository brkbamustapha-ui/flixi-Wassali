import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { adminRpc } from "@/lib/admin";
import { Pill } from "@/components/AdminUi";
import { dateTimeFr, da } from "@/lib/format";
import { APPROVAL_LABEL, APPROVAL_TONE, type AdminDriver } from "@/lib/adminTypes";

type Files = Record<"carte_grise_img" | "permis_img" | "selfie_img" | "vehicle_img" | "plate_img", string> | null;
const LABELS: [keyof NonNullable<Files>, string][] = [
  ["carte_grise_img", "Carte grise"], ["permis_img", "Permis de conduire"], ["selfie_img", "Selfie"], ["vehicle_img", "Véhicule"], ["plate_img", "Plaque / matricule"],
];

async function setApproval(fd: FormData) {
  "use server";
  const id = String(fd.get("id"));
  await adminRpc("flixi_admin_set_approval", { p_id: id, p_approval: String(fd.get("approval")), p_note: String(fd.get("note") ?? "") || null });
  revalidatePath(`/admin/drivers/${id}`);
  revalidatePath("/admin/drivers");
}
async function setStatus(fd: FormData) {
  "use server";
  const id = String(fd.get("id"));
  await adminRpc("flixi_admin_set_status", { p_id: id, p_status: String(fd.get("status")) });
  revalidatePath(`/admin/drivers/${id}`);
}

export default async function DriverDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const drivers = await adminRpc<AdminDriver[]>("flixi_admin_list", { what: "drivers" });
  const d = drivers.find((x) => x.id === id);
  if (!d) notFound();
  const files = d.has_file ? await adminRpc<Files>("flixi_admin_driver_files", { p_id: id }) : null;

  return (
    <div className="space-y-5">
      <Link href="/admin/drivers" className="text-sm font-bold text-brand-pink">← Tous les transporteurs</Link>
      <div className="card flex flex-wrap items-start justify-between gap-4 p-6">
        <div>
          <h1 className="text-2xl font-extrabold">{d.first_name} {d.last_name}</h1>
          <p className="mt-1 text-sm text-slate-600">📞 {d.phone} · ✉ {d.email}</p>
          <p className="text-sm text-slate-600">Inscrit le {dateTimeFr(d.created_at)} · {d.deliveries} livraison(s) · commission due {da(d.unpaid)}</p>
        </div>
        <div className="flex gap-2">
          {d.approval && <Pill tone={APPROVAL_TONE[d.approval]}>{APPROVAL_LABEL[d.approval]}</Pill>}
          <Pill tone={d.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}>{d.status === "active" ? "Compte actif" : "Suspendu"}</Pill>
        </div>
      </div>

      {!d.has_file ? (
        <div className="card p-6 text-slate-600">Ce transporteur n'a pas encore envoyé son dossier.</div>
      ) : (
        <>
          <div className="card grid gap-4 p-6 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Info k="Véhicule" v={d.vehicle_type} /><Info k="Matricule" v={d.plate_number} /><Info k="Wilaya" v={d.wilaya} />
            <Info k={d.license_kind === "registre_commerce" ? "Registre de commerce" : "Licence / Agrément"} v={d.license_number} />
            <Info k="Conditions acceptées le" v={dateTimeFr(d.accepted_terms_at)} />
            <Info k="Responsabilité marchandise" v="Acceptée ✔" /><Info k="Localisation" v="Consentement donné ✔" />
          </div>
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-extrabold">Documents fournis</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {files && LABELS.map(([k, l]) => (
                <a key={k} href={files[k]} target="_blank" rel="noreferrer" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={files[k]} alt={l} className="h-56 w-full rounded-2xl border border-violet-100 object-cover" />
                  <p className="mt-1 text-sm font-bold">{l}</p>
                </a>
              ))}
            </div>
          </div>
          <form action={setApproval} className="card space-y-3 p-6">
            <h2 className="text-lg font-extrabold">Décision</h2>
            <input type="hidden" name="id" value={id} />
            <textarea name="note" defaultValue={d.admin_note ?? ""} placeholder="Note interne / motif de refus (visible par le transporteur)" className="textarea" rows={2} />
            <div className="flex flex-wrap gap-2">
              <button name="approval" value="approved" className="btn btn-ok">✔ Approuver</button>
              <button name="approval" value="rejected" className="btn btn-danger">✖ Refuser</button>
              <button name="approval" value="pending" className="btn btn-ghost">Remettre à valider</button>
            </div>
          </form>
        </>
      )}
      <form action={setStatus}>
        <input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={d.status === "active" ? "suspended" : "active"} />
        <button className="btn btn-ghost text-sm">{d.status === "active" ? "Suspendre le compte" : "Réactiver le compte"}</button>
      </form>
    </div>
  );
}
const Info = ({ k, v }: { k: string; v: string | null }) => (<div><p className="text-xs font-bold uppercase text-slate-500">{k}</p><p className="font-bold">{v ?? "—"}</p></div>);
