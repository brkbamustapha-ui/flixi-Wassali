"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";

/** Course terminée (confirmée par le client ET le transporteur) : elle est archivée dans l'historique.
 *  Si la fin de course est constatée pendant que la page est ouverte, on bascule automatiquement vers l'historique. */
export default function ArchivedBanner({ role, status }: { role: "client" | "driver"; status: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const prev = useRef(status);
  useEffect(() => {
    const justFinished = prev.current !== "delivered" && status === "delivered";
    prev.current = status;
    if (!justFinished) return;
    const id = window.setTimeout(() => router.push(`/${role}/history`), 3500);
    return () => window.clearTimeout(id);
  }, [status, role, router]);
  if (status !== "delivered") return null;
  return (
    <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-4 text-sm">
      <p className="font-extrabold text-emerald-800">✅ {t("Course terminée et archivée")}</p>
      <p className="mt-1 text-emerald-900">{t("Le client et le transporteur ont tous les deux confirmé : la course est finalisée et rangée dans votre historique.")}</p>
      <Link href={`/${role}/history`} className="btn btn-primary mt-3 !py-2 text-sm">🕘 {t("Voir mon historique")}</Link>
    </div>
  );
}
