"use client";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import LangSwitch from "@/components/LangSwitch";
import { COMMISSION, MIN_PRICE, da } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

const H = "text-lg font-extrabold";

export default function Conditions() {
  const { t } = useI18n();
  const a = { min: da(MIN_PRICE), com: da(COMMISSION) };
  return (
    <div className="grad-soft min-h-screen px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 flex justify-end"><LangSwitch /></div>
        <Link href="/" className="mb-6 flex justify-center"><Logo size={44} /></Link>
        <article className="card space-y-5 p-6 sm:p-10 leading-relaxed">
          <header>
            <h1 className="text-3xl font-extrabold">{t("Conditions générales d'utilisation (CGU)")}</h1>
            <p className="mt-1 text-sm opacity-70">{t("Dernière mise à jour : 7 octobre 2026")}</p>
          </header>

          <section><h2 className={H}>{t("Article 1 : Objet et préambule")}</h2>
            <p>{t("Les présentes Conditions Générales d'Utilisation (« CGU ») régissent l'utilisation de l'application et des services web Flixi Tawsil (« la Plateforme »), éditée par Flixi Tawsil (« l'Éditeur »).")}</p>
            <p className="mt-2">{t("La Plateforme est un service technologique assurant la mise en relation à distance entre des utilisateurs souhaitant bénéficier d'un service de transport de marchandises (« les Clients ») et des prestataires de transport indépendants (« les Transporteurs »).")}</p></section>

          <section><h2 className={H}>{t("Article 2 : Rôle de la Plateforme (intermédiation)")}</h2>
            <p>{t("L'Utilisateur reconnaît expressément que l'Éditeur agit exclusivement en qualité de courtier et d'intermédiaire technologique.")}</p>
            <ul className="mt-2 list-disc space-y-1 ps-5">
              <li>{t("L'Éditeur ne fournit pas de services de transport et ne possède pas de flotte de véhicules.")}</li>
              <li>{t("Le contrat de transport est conclu directement et exclusivement entre le Client et le Transporteur sélectionné.")}</li>
              <li>{t("Les Transporteurs sont des professionnels ou des prestataires indépendants et ne sont aucunement liés à l'Éditeur par un lien de subordination ou un contrat de travail.")}</li>
            </ul></section>

          <section><h2 className={H}>{t("Article 3 : Accès et inscription")}</h2>
            <ul className="list-disc space-y-1 ps-5">
              <li><b>{t("Éligibilité :")}</b> {t("l'accès à l'application est réservé aux personnes physiques âgées d'au moins 19 ans (âge de la majorité civile en Algérie) ou aux personnes morales légalement constituées.")}</li>
              <li><b>{t("Compte Utilisateur :")}</b> {t("pour utiliser la Plateforme, l'Utilisateur doit créer un compte en fournissant des informations exactes, complètes et à jour. Il est seul responsable de la confidentialité de ses identifiants.")}</li>
              <li><b>{t("Vérification des Transporteurs :")}</b> {t("tout Transporteur s'engage à fournir à l'Éditeur les documents légaux requis en cours de validité (permis de conduire, carte grise, contrôle technique, assurance du véhicule, registre de commerce / NIF ou agrément le cas échéant), ainsi qu'un selfie et les photos et le matricule du véhicule.")}</li>
              <li>{t("Le Transporteur s'engage à laisser sa localisation activée pendant toute la livraison afin que la marchandise soit suivie, et assume l'entière responsabilité de la marchandise transportée depuis la prise en charge jusqu'à la livraison.")}</li>
              <li>{t("Refuser ces conditions rend l'ouverture d'un compte impossible.")}</li>
            </ul></section>

          <section><h2 className={H}>{t("Article 4 : Tarifs et paiement")}</h2>
            <ul className="list-disc space-y-1 ps-5">
              <li><b>{t("Tarification :")}</b> {t("les tarifs des courses sont affichés sur l'application en Dinars Algériens (DZD) avant la confirmation. Le prix minimum d'une course est de {min}. Le prix est convenu entre le Client et le Transporteur : la commande n'est conclue que lorsque les deux parties ont accepté le même prix.", a)}</li>
              <li><b>{t("Frais de service :")}</b> {t("l'Éditeur perçoit une commission fixe de {com} par course conclue, clairement indiquée avant validation. Le Client règle au Transporteur le prix convenu plus cette commission.", a)}</li>
              <li><b>{t("Modes de paiement :")}</b> {t("le prix de la course est réglé en espèces directement auprès du Transporteur. Le Transporteur reverse les commissions de la semaine à l'Éditeur, au bureau, par Edahabia, CIB, Visa ou Mastercard.")}</li>
            </ul></section>

          <section><h2 className={H}>{t("Article 5 : Limitation de responsabilité")}</h2>
            <ul className="list-disc space-y-1 ps-5">
              <li><b>{t("Exécution du transport :")}</b> {t("l'Éditeur ne saurait être tenu responsable des retards, annulations, accidents, pertes ou dommages matériels ou corporels survenus pendant le trajet, la responsabilité exclusive incombant au Transporteur.")}</li>
              <li><b>{t("Objets interdits :")}</b> {t("il est strictement interdit d'utiliser le service pour le transport de produits illicites, dangereux, inflammables ou contraires aux lois algériennes en vigueur. Le Client doit décrire fidèlement sa marchandise (nature, poids, adresses).")}</li>
              <li><b>{t("Disponibilité du service :")}</b> {t("l'Éditeur s'efforce de maintenir la Plateforme accessible 24h/24 et 7j/7, mais ne garantit pas l'absence d'interruptions techniques, de pannes du réseau télécom ou de bugs informatiques.")}</li>
            </ul></section>

          <section><h2 className={H}>{t("Article 6 : Protection des données personnelles")}</h2>
            <p>{t("L'Éditeur collecte et traite les données personnelles des Utilisateurs (nom, téléphone, données de géolocalisation, etc.) dans le strict respect de la réglementation algérienne relative à la protection des personnes physiques dans le traitement des données à caractère personnel (Loi n° 18-07). Ces données sont utilisées exclusivement pour le bon fonctionnement du service de mise en relation.")}</p>
            <p className="mt-2">{t("Les numéros de téléphone des deux parties ne sont affichés qu'une fois la commande conclue. Pour la sécurité des comptes et la prévention de la fraude, l'adresse IP et le type d'appareil utilisés lors des connexions sont enregistrés et consultables uniquement par l'équipe Flixi Tawsil.")}</p></section>

          <section><h2 className={H}>{t("Article 7 : Propriété intellectuelle")}</h2>
            <p>{t("L'ensemble des éléments constitutifs de l'application (marques, logos, codes sources, interfaces, graphismes) sont la propriété exclusive de l'Éditeur. Toute reproduction, copie ou exploitation non autorisée est strictement interdite.")}</p></section>

          <section><h2 className={H}>{t("Article 8 : Suspension et résiliation")}</h2>
            <p>{t("L'Éditeur se réserve le droit de suspendre ou de supprimer immédiatement le compte de tout Utilisateur (Client ou Transporteur) en cas de :")}</p>
            <ul className="mt-2 list-disc space-y-1 ps-5">
              <li>{t("violation des présentes CGU ;")}</li>
              <li>{t("comportement irrespectueux, dangereux ou frauduleux ;")}</li>
              <li>{t("fourniture de fausses informations ou de documents expirés ou falsifiés.")}</li>
            </ul></section>

          <section><h2 className={H}>{t("Article 9 : Droit applicable et juridiction compétente")}</h2>
            <p>{t("Les présentes CGU sont régies et interprétées conformément au droit algérien. En cas de litige non résolu à l'amiable, les tribunaux compétents du siège social de l'Éditeur seront seuls compétents.")}</p></section>
        </article>
      </div>
    </div>
  );
}
