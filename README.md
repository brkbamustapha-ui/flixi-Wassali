# Flixi Tawsil — فليكسي توصيل

Plateforme web de transport de marchandises dans les 58 wilayas d'Algérie.

* **Client** : compte (email ou Google), publie une marchandise (type, départ, arrivée, prix ≥ 1 000 DA), compare les offres, suit la livraison sur la carte.
* **Transporteur** : dossier vérifié (carte grise, permis, selfie, agrément/registre de commerce, photo + matricule), conditions + localisation obligatoires, propose ses prix (enchères) et annonce ses trajets.
* **Règle d'or** : la commande n'est conclue que si client **et** transporteur acceptent le même prix ; les numéros s'affichent alors.
* **Commission** : 500 DA fixes par course, versés chaque semaine au bureau (Edahabia / CIB / Visa / Mastercard).
* **Admin** (`/admin`) : identifiant + mot de passe, clients/transporteurs, validation des dossiers, commandes, commissions, carte en direct.

## Stack
Next.js 15 · Supabase (Postgres + Auth + RLS) · Leaflet/OpenStreetMap · Vercel.

## Installation
```bash
cp .env.example .env.local   # renseigner les variables
npm i && npm run dev
```
Schéma SQL : `supabase/migrations/` (tables préfixées `flixi_`). Puis enregistrer le hash du secret admin :
```sql
insert into flixi_admin_config (id, secret_hash) values (1, encode(sha256(convert_to('<ADMIN_API_SECRET>','utf8')),'hex'));
```

## Variables d'environnement
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_API_SECRET`, `ADMIN_SESSION_SECRET`.

## Google Sign-In
Supabase → Authentication → Providers → Google, puis ajouter `https://<domaine>/auth/callback` aux *Redirect URLs*.
