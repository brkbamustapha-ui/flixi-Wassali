-- 005 : enchères terminées uniquement par celui qui les lance, toutes les offres visibles, IP/présence, durcissement.
-- (Appliquée par morceaux. Évite les instructions DROP/DELETE : l'outil d'administration les bloque en attente de confirmation.)

-- ===== IP, présence, anti force brute admin (tables réservées au serveur : RLS activée, aucun droit client) =====
create table if not exists public.flixi_user_ips (
  user_id uuid not null references public.flixi_profiles(id) on delete cascade, ip text not null, user_agent text,
  first_seen timestamptz not null default now(), last_seen timestamptz not null default now(), hits int not null default 1,
  primary key (user_id, ip));
create table if not exists public.flixi_admin_attempts (id bigserial primary key, ip text not null, at timestamptz not null default now(), ok boolean not null default false);
create index if not exists flixi_admin_attempts_ip_idx on public.flixi_admin_attempts (ip, at);
create table if not exists public.flixi_presence (user_id uuid primary key references public.flixi_profiles(id) on delete cascade, role text, last_seen timestamptz not null default now());
alter table public.flixi_user_ips enable row level security;
alter table public.flixi_admin_attempts enable row level security;
alter table public.flixi_presence enable row level security;
revoke all on public.flixi_user_ips, public.flixi_admin_attempts, public.flixi_presence from anon, authenticated;

-- fonctions : flixi_track_ip, flixi_admin_login_allowed/failed/ok, flixi_admin_user_ips (secret serveur requis, exécutables par anon),
--             flixi_ping, flixi_online_counts (authenticated). Voir le code appliqué dans l'historique de l'application.
-- flixi_admin_list / flixi_admin_overview : ajout de last_ip, last_ip_at, online, online_clients, online_drivers.

-- ===== Enchères manuelles =====
-- auction_ends_at n'est plus utilisé (toujours null). Seule l'expiration à la date de départ est automatique (flixi_settle_all).
-- Nouvelles fonctions : flixi_order_end_auction (client), flixi_trip_end_auction (transporteur), refus -> l'enchère reprend,
--   flixi_driver_buy_now = simple offre au prix du client, flixi_trip_bid = offre (plus d'achat immédiat),
--   flixi_order_stats / flixi_available_trips : renvoient TOUTES les offres (prix + prénom), flixi_my_events : évènements de félicitations.
-- Anciennes fonctions flixi_close_auction_now / flixi_trip_close_now : exécution révoquée.

-- ===== Durcissement =====
alter function public.flixi_depart_at(date, time) set search_path = public;
alter table public.flixi_drivers add constraint flixi_drivers_img_check check (
  carte_grise_img like 'data:image/jpeg;base64,%' and permis_img like 'data:image/jpeg;base64,%' and selfie_img like 'data:image/jpeg;base64,%'
  and vehicle_img like 'data:image/jpeg;base64,%' and plate_img like 'data:image/jpeg;base64,%'
  and length(carte_grise_img) <= 1500000 and length(permis_img) <= 1500000 and length(selfie_img) <= 1500000
  and length(vehicle_img) <= 1500000 and length(plate_img) <= 1500000);
alter table public.flixi_drivers add constraint flixi_drivers_text_check check (
  length(vehicle_type) <= 80 and length(plate_number) <= 30 and length(license_number) <= 60 and coalesce(length(wilaya), 0) <= 40);
alter table public.flixi_profiles add constraint flixi_profiles_text_check check (
  length(first_name) between 1 and 60 and length(last_name) between 1 and 60 and length(phone) between 1 and 20 and coalesce(length(email), 0) <= 200);
alter table public.flixi_orders add constraint flixi_orders_text_check check (
  length(goods_type) <= 60 and coalesce(length(description), 0) <= 500 and coalesce(length(from_address), 0) <= 200 and coalesce(length(to_address), 0) <= 200
  and (weight_kg is null or (weight_kg >= 0 and weight_kg <= 100000)) and client_price <= 10000000);
alter table public.flixi_bids add constraint flixi_bids_text_check check (coalesce(length(note), 0) <= 300 and price <= 10000000);
alter table public.flixi_trips add constraint flixi_trips_text_check check (coalesce(length(note), 0) <= 300 and (price is null or price <= 10000000));
-- quotas : 20 commandes ouvertes par client, 20 trajets ouverts par transporteur (triggers flixi_orders_quota / flixi_trips_quota)
-- un transporteur ne peut que fermer son trajet, pas le rouvrir :
alter policy trips_update_own on public.flixi_trips using (driver_id = auth.uid() and status = 'open') with check (driver_id = auth.uid() and status = 'closed');
-- les triggers d'inscription tronquent noms/téléphone (60/60/20) pour respecter les contraintes.

-- ===== Documents transporteur supplémentaires (appliqué via execute_sql) =====
-- flixi_drivers: controle_technique_img, assurance_img, registre_nif_img, registre_nif_kind ('registre_commerce'|'nif'), registre_nif_number
-- + contrainte flixi_drivers_docs_check, grant insert sur ces colonnes, flixi_admin_driver_files renvoie ces champs.

-- ===== Date de naissance / 19 ans minimum (appliqué via execute_sql) =====
-- flixi_profiles.birth_date ; flixi_age_ok(date) ; flixi_handle_new_user exige birth_date >= 19 ans (sinon exception) ;
-- flixi_complete_profile(role, first, last, phone, birth) remplace l'ancienne signature (exécution révoquée).

-- flixi_set_birth(date): anciens comptes sans date -> enregistre ; < 19 ans => compte suspendu (appliqué via execute_sql)
