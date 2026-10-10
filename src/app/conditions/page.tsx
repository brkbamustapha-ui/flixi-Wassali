"use client";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import LangSwitch from "@/components/LangSwitch";
import SupportContact from "@/components/SupportContact";
import { useI18n } from "@/lib/i18n";

const H = "text-lg font-extrabold";
const UL = "mt-2 list-disc space-y-1 ps-5";

export default function Conditions() {
  const { t } = useI18n();
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
            <p>{t("Les présentes Conditions Générales d'Utilisation (« CGU ») régissent l'utilisation de l'application et des services web Flixi Wassali (« la Plateforme »), éditée par Flixi Wassali (« l'Éditeur »).")}</p>
            <p className="mt-2">{t("La Plateforme est un service technologique assurant la mise en relation à distance entre des utilisateurs souhaitant bénéficier d'un service de transport de marchandises (« les Clients ») et des prestataires de transport indépendants (« les Transporteurs »).")}</p></section>

          <section><h2 className={H}>{t("Article 2 : Rôle de la Plateforme (intermédiation)")}</h2>
            <p>{t("L'Utilisateur reconnaît expressément que l'Éditeur agit exclusivement en qualité de courtier et d'intermédiaire technologique.")}</p>
            <ul className={UL}>
              <li>{t("L'Éditeur ne fournit pas de services de transport et ne possède pas de flotte de véhicules.")}</li>
              <li>{t("Le contrat de transport est conclu directement et exclusivement entre le Client et le Transporteur sélectionné.")}</li>
              <li>{t("Les Transporteurs sont des professionnels ou des prestataires indépendants et ne sont aucunement liés à l'Éditeur par un lien de subordination ou un contrat de travail.")}</li>
              <li>{t("Le site n'est en aucun cas responsable de la marchandise chargée ou expédiée.")}</li>
            </ul></section>

          <section><h2 className={H}>{t("Article 3 : Accès et inscription")}</h2>
            <ul className="list-disc space-y-1 ps-5">
              <li><b>{t("Éligibilité :")}</b> {t("l'accès à l'application est réservé aux personnes physiques âgées d'au moins 19 ans (âge de la majorité civile en Algérie) ou aux personnes morales légalement constituées.")}</li>
              <li><b>{t("Compte Utilisateur :")}</b> {t("pour utiliser la Plateforme, l'Utilisateur doit créer un compte en fournissant des informations exactes, complètes et à jour. Il est seul responsable de la confidentialité de ses identifiants.")}</li>
              <li>{t("L'adresse e-mail doit être confirmée à l'inscription afin de garantir le sérieux des utilisateurs.")}</li>
              <li>{t("Un Utilisateur ne peut pas modifier son profil lui-même : toute modification n'est possible qu'avec l'accord de l'Éditeur.")}</li>
              <li><b>{t("Vérification des Transporteurs :")}</b> {t("tout Transporteur s'engage à fournir à l'Éditeur les documents légaux requis en cours de validité (permis de conduire, carte grise, contrôle technique, assurance du véhicule, registre de commerce / NIF ou agrément le cas échéant), ainsi qu'un selfie et les photos et le matricule du véhicule.")}</li>
              <li>{t("Le Transporteur s'engage à laisser sa localisation activée pendant toute la livraison afin que la marchandise soit suivie, et assume l'entière responsabilité de la marchandise transportée depuis la prise en charge jusqu'à la livraison.")}</li>
              <li>{t("Le Transporteur accepte ces conditions à sa première connexion (une seule fois) et peut les relire à tout moment depuis son compte.")}</li>
              <li>{t("La localisation doit être activée et rester activée en permanence : sans elle, le Transporteur ne peut ni enchérir ni accepter une commande, et ne peut pas la désactiver une fois la course acceptée.")}</li>
              <li>{t("Le Client modifie son profil librement. Le Transporteur modifie ses informations puis envoie une demande de modification, appliquée seulement après accord de l'Éditeur.")}</li>
              <li>{t("Chaque numéro de téléphone ou e-mail ajouté ou modifié est confirmé par un code envoyé automatiquement par SMS ou par e-mail.")}</li>
              <li>{t("Refuser ces conditions rend l'ouverture d'un compte impossible.")}</li>
            </ul></section>

          <section><h2 className={H}>{t("Article 4 : Tarifs, commission et paiement")}</h2>
            <ul className="list-disc space-y-1 ps-5">
              <li><b>{t("Prix libre :")}</b> {t("le prix d'une course est libre et sans limite minimale (y compris pour de petits colis transportés en moto). Il est convenu entre le Client et le Transporteur : la commande n'est conclue que lorsque les deux parties ont accepté le même prix.")}</li>
              <li><b>{t("Commission :")}</b> {t("l'Éditeur perçoit une commission en pourcentage du prix de la course : 12 % en dessous de 5 000 DA, 10 % de 5 000 à 8 000 DA, 8 % au-dessus de 8 000 DA.")}</li>
              <li>{t("La commission est à la charge du Transporteur : son prix d'enchère doit l'inclure et l'application lui indique, avant l'envoi de l'enchère, ce qu'il touchera et ce que représente la commission. Le Client ne paie que le prix convenu.")}</li>
              <li><b>{t("Modes de paiement :")}</b> {t("le prix de la course est réglé en espèces directement auprès du Transporteur. Le Transporteur reverse ses commissions à l'Éditeur chaque samedi, au bureau, par Edahabia, CIB, Visa ou Mastercard.")}</li>
            </ul></section>

          <section><h2 className={H}>{t("Article 5 : Marchandise et limitation de responsabilité")}</h2>
            <ul className="list-disc space-y-1 ps-5">
              <li><b>{t("Exécution du transport :")}</b> {t("l'Éditeur ne saurait être tenu responsable des retards, annulations, accidents, pertes ou dommages matériels ou corporels survenus pendant le trajet, la responsabilité exclusive incombant au Transporteur.")}</li>
              <li><b>{t("Description de la marchandise :")}</b> {t("le Client décrit fidèlement sa marchandise (nature, poids, dimensions, adresses), joint si possible une photo et indique si une manutention est nécessaire.")}</li>
              <li>{t("Le Transporteur a le droit de demander au Client de vérifier le contenu du chargement.")}</li>
              <li><b>{t("Objets interdits :")}</b> {t("il est strictement interdit d'utiliser le service pour le transport de produits illicites, dangereux, inflammables ou contraires aux lois algériennes en vigueur.")}</li>
              <li>{t("Le Transporteur peut annuler la course s'il constate que la marchandise est interdite, présente un danger ou n'est pas conforme aux indications du Client. Il le signale dans l'application avec une justification ; l'Éditeur est alerté.")}</li>
              <li><b>{t("Disponibilité du service :")}</b> {t("l'Éditeur s'efforce de maintenir la Plateforme accessible 24h/24 et 7j/7, mais ne garantit pas l'absence d'interruptions techniques, de pannes du réseau télécom ou de bugs informatiques.")}</li>
            </ul></section>

          <section><h2 className={H}>{t("Article 6 : Enchères et courses urgentes")}</h2>
            <ul className="list-disc space-y-1 ps-5">
              <li>{t("Tous les Transporteurs en ligne peuvent enchérir sur une demande ; toutes les offres sont visibles, sans le nom des autres Transporteurs. Le Transporteur ne voit pas le nom du Client.")}</li>
              <li>{t("Le Client choisit librement le Transporteur qui effectue la course parmi les offres reçues, pas nécessairement le moins cher. Pour un trajet annoncé par un Transporteur, c'est le Transporteur qui choisit le Client.")}</li>
              <li>{t("Le Client choisit la durée de l'enchère, ou la termine lui-même quand il le souhaite.")}</li>
              <li>{t("Dans les annonces, aucun nom n'est affiché : chaque commande ou trajet porte une référence. Les noms et numéros ne sont visibles qu'une fois la commande confirmée, et une messagerie s'ouvre alors entre le Client et le Transporteur.")}</li>
              <li>{t("L'historique des courses terminées reste consultable, sans le nom, le prénom ni le numéro de l'autre partie.")}</li>
              <li>{t("Un Transporteur ayant déjà une course d'un point A à un point B peut annoncer un trajet entre deux points situés sur cet itinéraire, s'il lui reste de la place dans son véhicule.")}</li>
              <li>{t("Une course dont le départ est dans moins de 2 heures est « urgente » (ou « express » pour un trajet) : elle est mise en avant afin que les Transporteurs puissent l'activer et que le Client profite d'un prix bas.")}</li>
            </ul></section>

          <section><h2 className={H}>{t("Article 7 : Annulations, avertissements et bannissement")}</h2>
            <ul className="list-disc space-y-1 ps-5">
              <li><b>{t("Client :")}</b> {t("le Client peut annuler une course conclue s'il reste plus de 24 heures avant le départ. En dessous de 24 heures, il doit demander l'annulation avec un motif et le Transporteur doit l'accepter.")}</li>
              <li><b>{t("Transporteur :")}</b> {t("une fois la course acceptée, le Transporteur ne peut l'annuler librement que s'il reste plus de 24 heures avant le départ. En dessous de 24 heures, il doit donner une justification que le Client voit, et c'est au Client d'accepter l'annulation. L'Éditeur reçoit une alerte sur chaque annulation et en assure le suivi.")}</li>
              <li><b>{t("Déplacement sans chargement :")}</b> {t("si le Transporteur se déplace chez le Client et que celui-ci, pour quelque raison que ce soit, ne lui charge pas la marchandise, le Client doit payer 10 % de la somme du transport. S'il refuse, le Transporteur le signale dans l'application : après vérification, le Client reçoit un avertissement.")}</li>
              <li><b>{t("Bannissement automatique :")}</b> {t("un Transporteur qui annule 3 courses en moins d'une semaine est banni pendant 1 semaine ; son adresse IP est associée au bannissement. Il peut envoyer une demande de levée, et l'Éditeur décide de maintenir ou de lever le bannissement.")}</li>
              <li><b>{t("Avertissements :")}</b> {t("tout manquement (annulation abusive sans accord, refus de payer, etc.) donne lieu à un avertissement. Au bout de 2 avertissements, le compte est banni.")}</li>
            </ul></section>

          <section><h2 className={H}>{t("Article 7 bis : Notation et avis")}</h2>
            <p>{t("Après chaque course livrée, le Client note le Transporteur et le Transporteur note le Client par étoiles (de 1 à 5), avec un avis facultatif. Les notes moyennes sont visibles des autres utilisateurs.")}</p></section>

          <section><h2 className={H}>{t("Article 8 : Protection des données personnelles")}</h2>
            <p>{t("L'Éditeur collecte et traite les données personnelles des Utilisateurs (nom, téléphone, données de géolocalisation, etc.) dans le strict respect de la réglementation algérienne relative à la protection des personnes physiques dans le traitement des données à caractère personnel (Loi n° 18-07). Ces données sont utilisées exclusivement pour le bon fonctionnement du service de mise en relation.")}</p>
            <p className="mt-2">{t("Les numéros de téléphone des deux parties ne sont affichés qu'une fois la commande conclue. Pour la sécurité des comptes et la prévention de la fraude, l'adresse IP et le type d'appareil utilisés lors des connexions sont enregistrés et consultables uniquement par l'équipe Flixi Wassali.")}</p></section>

          <section><h2 className={H}>{t("Article 9 : Propriété intellectuelle")}</h2>
            <p>{t("L'ensemble des éléments constitutifs de l'application (marques, logos, codes sources, interfaces, graphismes) sont la propriété exclusive de l'Éditeur. Toute reproduction, copie ou exploitation non autorisée est strictement interdite.")}</p></section>

          <section><h2 className={H}>{t("Article 10 : Suspension et résiliation")}</h2>
            <p>{t("L'Éditeur se réserve le droit de suspendre ou de supprimer immédiatement le compte de tout Utilisateur (Client ou Transporteur) en cas de :")}</p>
            <ul className={UL}>
              <li>{t("violation des présentes CGU ;")}</li>
              <li>{t("comportement irrespectueux, dangereux ou frauduleux ;")}</li>
              <li>{t("fourniture de fausses informations ou de documents expirés ou falsifiés.")}</li>
            </ul></section>

          <section><h2 className={H}>{t("Article 11 : Droit applicable et juridiction compétente")}</h2>
            <p>{t("Les présentes CGU sont régies et interprétées conformément au droit algérien. En cas de litige non résolu à l'amiable, les tribunaux compétents du siège social de l'Éditeur seront seuls compétents.")}</p></section>

          <section><h2 className={H}>{t("Article 12 : Contact")}</h2>
            <p className="mb-3">{t("Pour toute question, information ou modification de votre profil, contactez notre support :")}</p>
            <SupportContact />
          </section>
        </article>
      </div>
    </div>
  );
}
