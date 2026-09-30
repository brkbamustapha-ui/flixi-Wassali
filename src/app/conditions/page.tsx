"use client";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import LangSwitch from "@/components/LangSwitch";
import { COMMISSION, MIN_PRICE, da } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export default function Conditions() {
  const { t } = useI18n();
  const a = { min: da(MIN_PRICE), com: da(COMMISSION) };
  return (
    <div className="grad-soft min-h-screen px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 flex justify-end"><LangSwitch /></div>
        <Link href="/" className="mb-6 flex justify-center"><Logo size={44} /></Link>
        <article className="card space-y-5 p-6 sm:p-10 leading-relaxed">
          <h1 className="text-3xl font-extrabold">{t("Conditions d'utilisation")}</h1>
          <section><h2 className="text-lg font-extrabold">{t("1. Objet")}</h2><p>{t("Flixi Tawsil met en relation des clients ayant une marchandise à transporter et des transporteurs professionnels en Algérie. Flixi Tawsil est un intermédiaire technique.")}</p></section>
          <section><h2 className="text-lg font-extrabold">{t("2. Prix")}</h2><p>{t("Le prix minimum d'une course est de {min}. Le prix est convenu entre le client et le transporteur : la commande n'est conclue que lorsque les deux parties ont accepté le même prix.", a)}</p></section>
          <section><h2 className="text-lg font-extrabold">{t("3. Commission")}</h2><p>{t("Flixi Tawsil perçoit une commission fixe de {com} par course conclue. Le client règle au transporteur le prix convenu plus cette commission. Le transporteur reverse les commissions de la semaine à Flixi Tawsil, au bureau, par Edahabia, CIB, Visa ou Mastercard.", a)}</p></section>
          <section><h2 className="text-lg font-extrabold">{t("4. Obligations du transporteur")}</h2>
            <ul className="list-disc space-y-1 ps-5">
              <li>{t("Fournir des documents authentiques : carte grise, permis de conduire, selfie, numéro d'agrément ou de registre de commerce, photo et matricule du véhicule.")}</li>
              <li>{t("Laisser sa localisation activée pendant toute la livraison afin que la marchandise soit suivie.")}</li>
              <li>{t("Assumer l'entière responsabilité de la marchandise transportée (perte, dommage, retard) depuis la prise en charge jusqu'à la livraison.")}</li>
              <li>{t("Refuser ces conditions rend l'ouverture d'un compte transporteur impossible.")}</li>
            </ul></section>
          <section><h2 className="text-lg font-extrabold">{t("5. Obligations du client")}</h2><p>{t("Décrire fidèlement la marchandise (nature, poids, adresses), ne pas expédier de produits illicites ou dangereux non déclarés, et régler le montant convenu à la livraison.")}</p></section>
          <section><h2 className="text-lg font-extrabold">{t("6. Données personnelles")}</h2><p>{t("Les informations et documents fournis sont stockés de manière sécurisée, utilisés uniquement pour la vérification des comptes et la bonne exécution des livraisons. Les numéros de téléphone des deux parties ne sont affichés qu'une fois la commande conclue.")}</p></section>
          <section><h2 className="text-lg font-extrabold">{t("7. Suspension")}</h2><p>{t("Flixi Tawsil peut suspendre ou refuser tout compte ne respectant pas ces conditions.")}</p></section>
        </article>
      </div>
    </div>
  );
}
