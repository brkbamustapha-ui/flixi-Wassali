-- Flixi Tawsil — schéma (toutes les tables sont préfixées flixi_ pour cohabiter avec d'autres applis)

create table if not exists public.flixi_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('client','driver')),
  first_name text not null,
  last_name text not null,
  phone text not null,
  email text,
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now()
);

create table if not exists public.flixi_drivers (
  user_id uuid primary key references public.flixi_profiles(id) on delete cascade,
  wilaya text,
  vehicle_type text not null,
  plate_number text not null,
  license_kind text not null check (license_kind in ('agrement','registre_commerce')),
  license_number text not null,
  carte_grise_img text not null,
  permis_img text not null,
  selfie_img text not null,
  vehicle_img text not null,
  plate_img text not null,
  accepted_terms_at timestamptz not null default now(),
  responsibility_accepted boolean not null check (responsibility_accepted),
  location_consent boolean not null check (location_consent),
  approval text not null default 'pending' check (approval in ('pending','approved','rejected')),
  admin_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.flixi_orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.flixi_profiles(id) on delete cascade,
  goods_type text not null,
  description text,
  weight_kg numeric,
  from_wilaya text not null,
  from_address text,
  from_lat double precision,
  from_lng double precision,
  to_wilaya text not null,
  to_address text,
  to_lat double precision,
  to_lng double precision,
  client_price int not null check (client_price >= 1000),
  status text not null default 'open' check (status in ('open','matched','in_transit','delivered','cancelled')),
  driver_id uuid references public.flixi_profiles(id),
  final_price int check (final_price is null or final_price >= 1000),
  commission int not null default 500,
  created_at timestamptz not null default now(),
  matched_at timestamptz,
  delivered_at timestamptz
);
create index if not exists flixi_orders_status_idx on public.flixi_orders(status);
create index if not exists flixi_orders_client_idx on public.flixi_orders(client_id);
create index if not exists flixi_orders_driver_idx on public.flixi_orders(driver_id);

create table if not exists public.flixi_bids (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.flixi_orders(id) on delete cascade,
  driver_id uuid not null references public.flixi_profiles(id) on delete cascade,
  price int not null check (price >= 1000),
  note text,
  status text not null default 'pending' check (status in ('pending','client_accepted','confirmed','rejected')),
  created_at timestamptz not null default now(),
  unique (order_id, driver_id)
);

create table if not exists public.flixi_trips (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.flixi_profiles(id) on delete cascade,
  from_wilaya text not null,
  to_wilaya text not null,
  depart_date date not null,
  depart_time time not null,
  price int check (price is null or price >= 1000),
  note text,
  status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.flixi_commissions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.flixi_orders(id) on delete cascade,
  driver_id uuid not null references public.flixi_profiles(id) on delete cascade,
  amount int not null default 500,
  status text not null default 'unpaid' check (status in ('unpaid','paid')),
  method text check (method is null or method in ('edahabia','cib','visa','mastercard','especes')),
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.flixi_locations (
  order_id uuid primary key references public.flixi_orders(id) on delete cascade,
  driver_id uuid not null references public.flixi_profiles(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.flixi_admin_config (
  id int primary key default 1 check (id = 1),
  secret_hash text not null
);

alter table public.flixi_profiles enable row level security;
alter table public.flixi_drivers enable row level security;
alter table public.flixi_orders enable row level security;
alter table public.flixi_bids enable row level security;
alter table public.flixi_trips enable row level security;
alter table public.flixi_commissions enable row level security;
alter table public.flixi_locations enable row level security;
alter table public.flixi_admin_config enable row level security;

revoke all on public.flixi_profiles, public.flixi_drivers, public.flixi_orders, public.flixi_bids,
  public.flixi_trips, public.flixi_commissions, public.flixi_locations, public.flixi_admin_config
  from anon, authenticated;

-- Helpers (security definer pour éviter la récursion RLS)
create or replace function public.flixi_is_approved_driver(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from flixi_profiles p join flixi_drivers d on d.user_id = p.id
    where p.id = uid and p.role = 'driver' and p.status = 'active' and d.approval = 'approved'
  );
$$;

create or replace function public.flixi_is_active_client(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from flixi_profiles p where p.id = uid and p.role = 'client' and p.status = 'active');
$$;

-- Profils : lecture de son propre profil, modification nom/téléphone uniquement
grant select on public.flixi_profiles to authenticated;
grant update (first_name, last_name, phone) on public.flixi_profiles to authenticated;
create policy profiles_select_own on public.flixi_profiles for select to authenticated using (id = auth.uid());
create policy profiles_update_own on public.flixi_profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Dossier transporteur
grant select on public.flixi_drivers to authenticated;
grant insert (user_id, wilaya, vehicle_type, plate_number, license_kind, license_number, carte_grise_img,
  permis_img, selfie_img, vehicle_img, plate_img, responsibility_accepted, location_consent) on public.flixi_drivers to authenticated;
grant update (wilaya, vehicle_type, plate_number, license_kind, license_number) on public.flixi_drivers to authenticated;
create policy drivers_select_own on public.flixi_drivers for select to authenticated using (user_id = auth.uid());
create policy drivers_insert_own on public.flixi_drivers for insert to authenticated with check (
  user_id = auth.uid() and exists (select 1 from flixi_profiles p where p.id = auth.uid() and p.role = 'driver')
);
create policy drivers_update_own on public.flixi_drivers for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Commandes
grant select on public.flixi_orders to authenticated;
grant insert (client_id, goods_type, description, weight_kg, from_wilaya, from_address, from_lat, from_lng,
  to_wilaya, to_address, to_lat, to_lng, client_price) on public.flixi_orders to authenticated;
create policy orders_select on public.flixi_orders for select to authenticated using (
  client_id = auth.uid() or driver_id = auth.uid() or (status = 'open' and public.flixi_is_approved_driver(auth.uid()))
);
create policy orders_insert on public.flixi_orders for insert to authenticated with check (
  client_id = auth.uid() and public.flixi_is_active_client(auth.uid())
);

-- Offres (enchères)
grant select, delete on public.flixi_bids to authenticated;
grant insert (order_id, driver_id, price, note) on public.flixi_bids to authenticated;
grant update (price, note) on public.flixi_bids to authenticated;
create policy bids_select on public.flixi_bids for select to authenticated using (
  driver_id = auth.uid() or exists (select 1 from flixi_orders o where o.id = order_id and o.client_id = auth.uid())
);
create policy bids_insert on public.flixi_bids for insert to authenticated with check (
  driver_id = auth.uid() and public.flixi_is_approved_driver(auth.uid())
  and exists (select 1 from flixi_orders o where o.id = order_id and o.status = 'open')
);
create policy bids_update on public.flixi_bids for update to authenticated
  using (driver_id = auth.uid() and status = 'pending') with check (driver_id = auth.uid() and status = 'pending');
create policy bids_delete on public.flixi_bids for delete to authenticated using (driver_id = auth.uid() and status = 'pending');

-- Trajets proposés par les transporteurs
grant select, delete on public.flixi_trips to authenticated;
grant insert (driver_id, from_wilaya, to_wilaya, depart_date, depart_time, price, note) on public.flixi_trips to authenticated;
grant update (status) on public.flixi_trips to authenticated;
create policy trips_select_own on public.flixi_trips for select to authenticated using (driver_id = auth.uid());
create policy trips_insert on public.flixi_trips for insert to authenticated with check (
  driver_id = auth.uid() and public.flixi_is_approved_driver(auth.uid())
);
create policy trips_update_own on public.flixi_trips for update to authenticated using (driver_id = auth.uid()) with check (driver_id = auth.uid());
create policy trips_delete_own on public.flixi_trips for delete to authenticated using (driver_id = auth.uid());

-- Commissions : lecture seule côté transporteur
grant select on public.flixi_commissions to authenticated;
create policy commissions_select_own on public.flixi_commissions for select to authenticated using (driver_id = auth.uid());

-- Création automatique du profil à l'inscription par email
create or replace function public.flixi_handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if m ? 'flixi_role' and (m->>'flixi_role') in ('client','driver') then
    insert into flixi_profiles (id, role, first_name, last_name, phone, email)
    values (new.id, m->>'flixi_role', coalesce(nullif(m->>'first_name',''), 'Prénom'),
            coalesce(nullif(m->>'last_name',''), 'Nom'), coalesce(nullif(m->>'phone',''), '-'), new.email)
    on conflict (id) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists flixi_on_auth_user_created on auth.users;
create trigger flixi_on_auth_user_created after insert on auth.users
  for each row execute function public.flixi_handle_new_user();

-- Profil pour les comptes Google
create or replace function public.flixi_complete_profile(p_role text, p_first text, p_last text, p_phone text)
returns void language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_role not in ('client','driver') then raise exception 'invalid role'; end if;
  select email into v_email from auth.users where id = auth.uid();
  insert into flixi_profiles (id, role, first_name, last_name, phone, email)
  values (auth.uid(), p_role, p_first, p_last, p_phone, v_email)
  on conflict (id) do nothing;
end $$;

-- Transporteurs disponibles (trajets ouverts) visibles par les clients
create or replace function public.flixi_available_trips() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id, 'from_wilaya', t.from_wilaya, 'to_wilaya', t.to_wilaya, 'depart_date', t.depart_date,
    'depart_time', t.depart_time, 'price', t.price, 'note', t.note,
    'driver_first_name', p.first_name, 'vehicle_type', d.vehicle_type,
    'deliveries', (select count(*) from flixi_orders o where o.driver_id = p.id and o.status = 'delivered')
  ) order by t.depart_date, t.depart_time), '[]'::jsonb)
  from flixi_trips t join flixi_profiles p on p.id = t.driver_id join flixi_drivers d on d.user_id = p.id
  where t.status = 'open' and t.depart_date >= current_date and p.status = 'active' and d.approval = 'approved'
    and auth.uid() is not null;
$$;

-- Offres reçues pour une commande (vue client)
create or replace function public.flixi_order_bids(p_order uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not exists (select 1 from flixi_orders where id = p_order and client_id = auth.uid()) then
    raise exception 'forbidden';
  end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', b.id, 'price', b.price, 'note', b.note, 'status', b.status, 'created_at', b.created_at,
      'driver_first_name', p.first_name, 'vehicle_type', d.vehicle_type, 'wilaya', d.wilaya,
      'deliveries', (select count(*) from flixi_orders o where o.driver_id = p.id and o.status = 'delivered')
    ) order by b.price asc, b.created_at asc), '[]'::jsonb)
    from flixi_bids b join flixi_profiles p on p.id = b.driver_id join flixi_drivers d on d.user_id = p.id
    where b.order_id = p_order and b.status <> 'rejected');
end $$;

-- Le client choisit une offre
create or replace function public.flixi_client_accept_bid(p_bid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_order uuid;
begin
  select b.order_id into v_order from flixi_bids b join flixi_orders o on o.id = b.order_id
   where b.id = p_bid and o.client_id = auth.uid() and o.status = 'open' and b.status in ('pending','client_accepted');
  if v_order is null then raise exception 'offre introuvable'; end if;
  update flixi_bids set status = 'pending' where order_id = v_order and status = 'client_accepted';
  update flixi_bids set status = 'client_accepted' where id = p_bid;
end $$;

-- Le transporteur confirme : la commande est conclue
create or replace function public.flixi_driver_confirm_bid(p_bid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_order uuid; v_price int;
begin
  select b.order_id, b.price into v_order, v_price from flixi_bids b join flixi_orders o on o.id = b.order_id
   where b.id = p_bid and b.driver_id = auth.uid() and b.status = 'client_accepted' and o.status = 'open';
  if v_order is null then raise exception 'offre non confirmable'; end if;
  if not flixi_is_approved_driver(auth.uid()) then raise exception 'compte non approuvé'; end if;
  update flixi_bids set status = 'confirmed' where id = p_bid;
  update flixi_bids set status = 'rejected' where order_id = v_order and id <> p_bid;
  update flixi_orders set status = 'matched', driver_id = auth.uid(), final_price = v_price, matched_at = now() where id = v_order;
  insert into flixi_commissions (order_id, driver_id, amount) values (v_order, auth.uid(), 500) on conflict do nothing;
end $$;

create or replace function public.flixi_driver_decline_bid(p_bid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update flixi_bids set status = 'rejected' where id = p_bid and driver_id = auth.uid() and status = 'client_accepted';
end $$;

create or replace function public.flixi_start_transit(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update flixi_orders set status = 'in_transit' where id = p_order and driver_id = auth.uid() and status = 'matched';
  if not found then raise exception 'action impossible'; end if;
end $$;

create or replace function public.flixi_mark_delivered(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update flixi_orders set status = 'delivered', delivered_at = now() where id = p_order and driver_id = auth.uid() and status = 'in_transit';
  if not found then raise exception 'action impossible'; end if;
end $$;

create or replace function public.flixi_cancel_order(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update flixi_orders set status = 'cancelled' where id = p_order and client_id = auth.uid() and status = 'open';
  if not found then raise exception 'annulation impossible'; end if;
end $$;

-- Coordonnées des deux parties, visibles uniquement quand la commande est conclue
create or replace function public.flixi_order_contacts(p_order uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare o flixi_orders; c flixi_profiles; d flixi_profiles; dd flixi_drivers;
begin
  select * into o from flixi_orders where id = p_order;
  if o.id is null or auth.uid() not in (o.client_id, o.driver_id) or o.status not in ('matched','in_transit','delivered') then
    return null;
  end if;
  select * into c from flixi_profiles where id = o.client_id;
  select * into d from flixi_profiles where id = o.driver_id;
  select * into dd from flixi_drivers where user_id = o.driver_id;
  return jsonb_build_object(
    'client', jsonb_build_object('name', c.first_name || ' ' || c.last_name, 'phone', c.phone),
    'driver', jsonb_build_object('name', d.first_name || ' ' || d.last_name, 'phone', d.phone,
                                 'vehicle_type', dd.vehicle_type, 'plate_number', dd.plate_number));
end $$;

-- Suivi GPS
create or replace function public.flixi_update_location(p_order uuid, p_lat double precision, p_lng double precision) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from flixi_orders where id = p_order and driver_id = auth.uid() and status in ('matched','in_transit')) then
    raise exception 'forbidden';
  end if;
  insert into flixi_locations (order_id, driver_id, lat, lng, updated_at) values (p_order, auth.uid(), p_lat, p_lng, now())
  on conflict (order_id) do update set lat = excluded.lat, lng = excluded.lng, updated_at = now();
end $$;

create or replace function public.flixi_get_location(p_order uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('lat', l.lat, 'lng', l.lng, 'updated_at', l.updated_at)
  from flixi_locations l join flixi_orders o on o.id = l.order_id
  where l.order_id = p_order and auth.uid() in (o.client_id, o.driver_id);
$$;

-- ===== Administration (appelée uniquement par le serveur avec un secret) =====
create or replace function public.flixi_admin_check(s text) returns void
language plpgsql stable security definer set search_path = public as $$
begin
  if s is null or not exists (select 1 from flixi_admin_config where secret_hash = encode(sha256(convert_to(s, 'utf8')), 'hex')) then
    raise exception 'unauthorized';
  end if;
end $$;

create or replace function public.flixi_admin_overview(s text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform flixi_admin_check(s);
  return jsonb_build_object(
    'clients', (select count(*) from flixi_profiles where role = 'client'),
    'drivers', (select count(*) from flixi_profiles where role = 'driver'),
    'drivers_pending', (select count(*) from flixi_drivers where approval = 'pending'),
    'drivers_approved', (select count(*) from flixi_drivers where approval = 'approved'),
    'orders_total', (select count(*) from flixi_orders),
    'orders_open', (select count(*) from flixi_orders where status = 'open'),
    'orders_active', (select count(*) from flixi_orders where status in ('matched','in_transit')),
    'orders_delivered', (select count(*) from flixi_orders where status = 'delivered'),
    'volume', (select coalesce(sum(final_price), 0) from flixi_orders where status <> 'cancelled' and final_price is not null),
    'commissions_unpaid', (select coalesce(sum(amount), 0) from flixi_commissions where status = 'unpaid'),
    'commissions_paid', (select coalesce(sum(amount), 0) from flixi_commissions where status = 'paid')
  );
end $$;

create or replace function public.flixi_admin_list(s text, what text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  perform flixi_admin_check(s);
  if what = 'clients' then
    select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'last_name', p.last_name,
      'phone', p.phone, 'email', p.email, 'status', p.status, 'created_at', p.created_at,
      'orders', (select count(*) from flixi_orders o where o.client_id = p.id)) order by p.created_at desc), '[]'::jsonb)
      into r from flixi_profiles p where p.role = 'client';
  elsif what = 'drivers' then
    select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'first_name', p.first_name, 'last_name', p.last_name,
      'phone', p.phone, 'email', p.email, 'status', p.status, 'created_at', p.created_at,
      'has_file', d.user_id is not null, 'approval', d.approval, 'admin_note', d.admin_note, 'wilaya', d.wilaya,
      'vehicle_type', d.vehicle_type, 'plate_number', d.plate_number, 'license_kind', d.license_kind,
      'license_number', d.license_number, 'accepted_terms_at', d.accepted_terms_at,
      'deliveries', (select count(*) from flixi_orders o where o.driver_id = p.id and o.status = 'delivered'),
      'unpaid', (select coalesce(sum(c.amount), 0) from flixi_commissions c where c.driver_id = p.id and c.status = 'unpaid'))
      order by p.created_at desc), '[]'::jsonb)
      into r from flixi_profiles p left join flixi_drivers d on d.user_id = p.id where p.role = 'driver';
  elsif what = 'orders' then
    select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'goods_type', o.goods_type, 'description', o.description,
      'weight_kg', o.weight_kg, 'from_wilaya', o.from_wilaya, 'to_wilaya', o.to_wilaya, 'client_price', o.client_price,
      'final_price', o.final_price, 'commission', o.commission, 'status', o.status, 'created_at', o.created_at,
      'client_name', c.first_name || ' ' || c.last_name, 'client_phone', c.phone,
      'driver_name', d.first_name || ' ' || d.last_name, 'driver_phone', d.phone,
      'bids', (select count(*) from flixi_bids b where b.order_id = o.id)) order by o.created_at desc), '[]'::jsonb)
      into r from flixi_orders o join flixi_profiles c on c.id = o.client_id left join flixi_profiles d on d.id = o.driver_id;
  elsif what = 'trips' then
    select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'from_wilaya', t.from_wilaya, 'to_wilaya', t.to_wilaya,
      'depart_date', t.depart_date, 'depart_time', t.depart_time, 'price', t.price, 'status', t.status,
      'driver_name', p.first_name || ' ' || p.last_name, 'driver_phone', p.phone) order by t.depart_date desc), '[]'::jsonb)
      into r from flixi_trips t join flixi_profiles p on p.id = t.driver_id;
  elsif what = 'commissions' then
    select coalesce(jsonb_agg(jsonb_build_object('id', c.id, 'order_id', c.order_id, 'amount', c.amount, 'status', c.status,
      'method', c.method, 'paid_at', c.paid_at, 'created_at', c.created_at,
      'driver_name', p.first_name || ' ' || p.last_name, 'driver_phone', p.phone,
      'order_status', o.status) order by c.created_at desc), '[]'::jsonb)
      into r from flixi_commissions c join flixi_profiles p on p.id = c.driver_id join flixi_orders o on o.id = c.order_id;
  else
    raise exception 'unknown list';
  end if;
  return r;
end $$;

create or replace function public.flixi_admin_driver_files(s text, p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform flixi_admin_check(s);
  return (select jsonb_build_object('carte_grise_img', carte_grise_img, 'permis_img', permis_img,
    'selfie_img', selfie_img, 'vehicle_img', vehicle_img, 'plate_img', plate_img)
    from flixi_drivers where user_id = p_id);
end $$;

create or replace function public.flixi_admin_set_approval(s text, p_id uuid, p_approval text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform flixi_admin_check(s);
  if p_approval not in ('pending','approved','rejected') then raise exception 'invalid'; end if;
  update flixi_drivers set approval = p_approval, admin_note = p_note where user_id = p_id;
end $$;

create or replace function public.flixi_admin_set_status(s text, p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform flixi_admin_check(s);
  if p_status not in ('active','suspended') then raise exception 'invalid'; end if;
  update flixi_profiles set status = p_status where id = p_id;
end $$;

create or replace function public.flixi_admin_settle(s text, p_id uuid, p_method text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform flixi_admin_check(s);
  if p_method not in ('edahabia','cib','visa','mastercard','especes') then raise exception 'invalid method'; end if;
  update flixi_commissions set status = 'paid', method = p_method, paid_at = now() where id = p_id and status = 'unpaid';
end $$;

-- Droits d'exécution
-- Uniquement les fonctions flixi_* (le projet Supabase est partagé avec d'autres applis)
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'flixi\_%'
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;
grant execute on function public.flixi_is_approved_driver(uuid), public.flixi_is_active_client(uuid) to authenticated;
grant execute on function public.flixi_complete_profile(text, text, text, text),
  public.flixi_available_trips(), public.flixi_order_bids(uuid), public.flixi_client_accept_bid(uuid),
  public.flixi_driver_confirm_bid(uuid), public.flixi_driver_decline_bid(uuid), public.flixi_start_transit(uuid),
  public.flixi_mark_delivered(uuid), public.flixi_cancel_order(uuid), public.flixi_order_contacts(uuid),
  public.flixi_update_location(uuid, double precision, double precision), public.flixi_get_location(uuid)
  to authenticated;
grant execute on function public.flixi_admin_overview(text), public.flixi_admin_list(text, text),
  public.flixi_admin_driver_files(text, uuid), public.flixi_admin_set_approval(text, uuid, text, text),
  public.flixi_admin_set_status(text, uuid, text), public.flixi_admin_settle(text, uuid, text)
  to anon, authenticated;
