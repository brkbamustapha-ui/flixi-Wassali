import Link from "next/link";
import { Logo } from "@/components/Logo";
import { COMMISSION, MIN_PRICE, da } from "@/lib/format";

export const metadata = { title: "Conditions d'utilisation — Flixi Tawsil" };

export default function Conditions() {
  return (
    <div className="grad-soft min-h-screen px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="mb-6 flex justify-center"><Logo size={44} /></Link>
        <article className="card space-y-5 p-6 sm:p-10 leading-relaxed">
          <h1 className="text-3xl font-extrabold">Conditions d'utilisation</h1>
          <section><h2 className="text-lg font-extrabold">1. Objet</h2><p>Flixi Tawsil met en relation des clients ayant une marchandise à transporter et des transporteurs professionnels en Algérie. Flixi Tawsil est un intermédiaire technique.</p></section>
          <section><h2 className="text-lg font-extrabold">2. Prix</h2><p>Le prix minimum d'une course est de {da(MIN_PRICE)}. Le prix est convenu entre le client et le transporteur : la commande n'est conclue que lorsque <b>les deux parties</b> ont accepté le même prix.</p></section>
          <section><h2 className="text-lg font-extrabold">3. Commission</h2><p>Flixi Tawsil perçoit une commission fixe de {da(COMMISSION)} par course conclue. Le client règle au transporteur le prix convenu plus cette commission. Le transporteur reverse les commissions de la semaine à Flixi Tawsil, au bureau, par Edahabia, CIB, Visa ou Mastercard.</p></section>
          <section><h2 className="text-lg font-extrabold">4. Obligations du transporteur</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Fournir des documents authentiques : carte grise, permis de conduire, selfie, numéro d'agrément ou de registre de commerce, photo et matricule du véhicule.</li>
              <li>Laisser sa <b>localisation activée</b> pendant toute la livraison afin que la marchandise soit suivie.</li>
              <li>Assumer l'<b>entière responsabilité</b> de la marchandise transportée (perte, dommage, retard) depuis la prise en charge jusqu'à la livraison.</li>
              <li>Refuser ces conditions rend l'ouverture d'un compte transporteur impossible.</li>
            </ul></section>
          <section><h2 className="text-lg font-extrabold">5. Obligations du client</h2><p>Décrire fidèlement la marchandise (nature, poids, adresses), ne pas expédier de produits illicites ou dangereux non déclarés, et régler le montant convenu à la livraison.</p></section>
          <section><h2 className="text-lg font-extrabold">6. Données personnelles</h2><p>Les informations et documents fournis sont stockés de manière sécurisée, utilisés uniquement pour la vérification des comptes et la bonne exécution des livraisons. Les numéros de téléphone des deux parties ne sont affichés qu'une fois la commande conclue.</p></section>
          <section><h2 className="text-lg font-extrabold">7. Suspension</h2><p>Flixi Tawsil peut suspendre ou refuser tout compte ne respectant pas ces conditions.</p></section>
        </article>
      </div>
    </div>
  );
}
