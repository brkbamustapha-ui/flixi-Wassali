"use client";
import { compressImage } from "@/lib/images";
import { useI18n } from "@/lib/i18n";

export const MAX_PHOTOS = 5;

/** Plusieurs photos de la marchandise (jusqu'à 5) : la première est la photo principale. */
export default function PhotoPicker({ photos, onChange, onError, required }: { photos: string[]; onChange: (p: string[]) => void; onError?: (m: string) => void; required?: boolean }) {
  const { t } = useI18n();
  async function add(files: FileList | null) {
    if (!files?.length) return;
    const next = [...photos];
    for (const f of Array.from(files)) {
      if (next.length >= MAX_PHOTOS) break;
      try { next.push(await compressImage(f, 900, 0.65)); } catch { onError?.(t("Image illisible, réessayez.")); }
    }
    onChange(next);
  }
  return (
    <div className="space-y-2">
      <p className="text-sm font-extrabold">📷 {t("Photos de la marchandise")} {required && <span className="text-rose-600">*</span>} <span className="text-xs font-semibold text-slate-500">({photos.length}/{MAX_PHOTOS})</span></p>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {photos.map((p, i) => (
          <div key={i} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p} alt="" className="h-20 w-full rounded-xl object-cover" />
            <button type="button" onClick={() => onChange(photos.filter((_, j) => j !== i))} aria-label={t("Supprimer")} className="absolute -end-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-xs font-bold text-white">✕</button>
            {i === 0 && <span className="absolute bottom-1 start-1 rounded bg-black/60 px-1 text-[10px] font-bold text-white">{t("Principale")}</span>}
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <label className="flex h-20 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-violet-200 text-center text-xs font-bold text-slate-500 hover:border-brand-pink">
            <span className="text-2xl">＋</span>{t("Ajouter")}
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
          </label>
        )}
      </div>
      <p className="text-xs text-slate-500">{t("Le transporteur voit toutes les photos avant d'accepter. Plusieurs photos aident à estimer le prix réel.")}</p>
    </div>
  );
}
