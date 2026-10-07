"use client";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import LangSwitch from "@/components/LangSwitch";
import { useI18n } from "@/lib/i18n";
import { useAutoEnter } from "@/lib/useAutoEnter";
import { Spinner } from "@/components/ui";

export default function Home() {
  const { t } = useI18n();
  const checking = useAutoEnter();
  const steps = [
    { n: "1", t: t("Publiez"), d: t("Type de marchandise, wilaya de départ et d'arrivée, votre prix (minimum 1 000 DA).") },
    { n: "2", t: t("Comparez"), d: t("Les transporteurs vérifiés envoient leurs prix. Le meilleur prix gagne.") },
    { n: "3", t: t("Confirmez"), d: t("Client et transporteur acceptent : les numéros de téléphone s'affichent.") },
    { n: "4", t: t("Suivez"), d: t("Suivez votre marchandise en direct sur la carte jusqu'à la livraison.") },
  ];
  if (checking) return <div className="grad-soft min-h-screen pt-40"><Spinner /></div>;
  return (
    <div className="grad-soft min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-5">
        <Logo size={44} />
        <nav className="flex items-center gap-2 text-sm font-bold">
          <LangSwitch />
          <Link href="/client/login" className="btn btn-ghost !py-2">{t("Client")}</Link>
          <Link href="/driver/login" className="btn btn-primary !py-2">{t("Transporteur")}</Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-10 pt-8 text-center md:pt-16">
        <span className="badge gap-2 bg-white text-brand-pink shadow"><span>🇩🇿</span><span>{t("58 wilayas couvertes")}</span></span>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-6xl">
          {t("Transportez vos marchandises")} <span className="grad-text">{t("partout en Algérie")}</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
          {t("Fixez votre prix, laissez les transporteurs vérifiés enchérir, choisissez la meilleure offre et suivez la livraison en direct.")}
        </p>

        <p className="mt-10 text-sm font-bold uppercase tracking-widest text-slate-500">{t("Vous êtes…")}</p>
        <div className="mx-auto mt-4 grid max-w-3xl gap-5 md:grid-cols-2">
          <Link href="/client/login" className="group relative overflow-hidden rounded-3xl p-7 text-start text-white shadow-xl transition hover:-translate-y-1 grad-bg">
            <div className="text-5xl">📦</div>
            <h2 className="mt-4 text-2xl font-extrabold">{t("Je suis client")}</h2>
            <p className="mt-1 text-white/90">{t("J'ai une marchandise à transporter.")}</p>
            <span className="mt-5 inline-flex rounded-xl bg-white/20 px-4 py-2 text-sm font-bold backdrop-blur group-hover:bg-white/30">{t("Créer mon compte client")} →</span>
          </Link>
          <Link href="/driver/login" className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-500 p-7 text-start text-white shadow-xl transition hover:-translate-y-1">
            <div className="text-5xl">🚚</div>
            <h2 className="mt-4 text-2xl font-extrabold">{t("Je suis transporteur")}</h2>
            <p className="mt-1 text-white/90">{t("J'ai un véhicule et je veux des courses.")}</p>
            <span className="mt-5 inline-flex rounded-xl bg-white/20 px-4 py-2 text-sm font-bold backdrop-blur group-hover:bg-white/30">{t("Devenir transporteur")} →</span>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-center text-3xl font-extrabold">{t("Comment ça marche ?")}</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="card p-6">
              <div className="grad-bg flex h-10 w-10 items-center justify-center rounded-xl text-lg font-extrabold text-white">{s.n}</div>
              <h3 className="mt-4 text-lg font-extrabold">{s.t}</h3>
              <p className="mt-1 text-sm text-slate-600">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 pb-16">
        <div className="card grid gap-6 p-8 md:grid-cols-3">
          <div><p className="grad-text text-3xl font-extrabold">{t("Prix libre")}</p><p className="mt-1 text-sm font-semibold text-slate-600">{t("Vous fixez votre prix, même pour un petit colis : aucun minimum imposé.")}</p></div>
          <div><p className="grad-text text-3xl font-extrabold" dir="ltr">8 – 12 %</p><p className="mt-1 text-sm font-semibold text-slate-600">{t("Commission de la plateforme, payée par le transporteur : 12 % (< 5 000 DA), 10 % (5 000–8 000 DA), 8 % (> 8 000 DA).")}</p></div>
          <div><p className="grad-text text-3xl font-extrabold" dir="ltr">100 %</p><p className="mt-1 text-sm font-semibold text-slate-600">{t("Transporteurs vérifiés : permis, carte grise, agrément et selfie.")}</p></div>
        </div>
      </section>

      <footer className="border-t border-violet-100 py-8 text-center text-sm text-slate-500">
        <div className="flex justify-center"><Logo size={30} /></div>
        <p className="mt-3">© {new Date().getFullYear()} Flixi Tawsil · <Link href="/conditions" className="font-bold text-brand-pink">{t("Conditions d'utilisation")}</Link></p>
      </footer>
    </div>
  );
}
