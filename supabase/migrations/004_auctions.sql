-- ======================= ENCHÈRES AVEC DURÉE =======================
-- Durée d'une enchère = la moitié du temps entre la publication et le départ.
-- Trajet d'un transporteur : les clients enchérissent (prix le plus HAUT gagne), le transporteur accepte le gagnant.
-- Demande d'un client : les transporteurs enchérissent (prix le plus BAS gagne), le client accepte le gagnant.
-- Si le gagnant est refusé (ou s'il n'y a aucune offre), l'enchère recommence (moitié du temps restant).

create or replace function public.flixi_depart_at(d date, t time) returns timestamptz
language sql stable as $$ select ((d + t) at time zone 'Africa/Algiers') $$;

-- ---------- commandes (demandes des clients) ----------
alter table public.flixi_orders
  add column if not exists depart_date date,
  add column if not exists depart_time time,
  add column if not exists auction_ends_at timestamptz,
  add column if not exists auction_round int not null default 1,
  add column if not exists phase text not null default 'bidding',
  add column if not exists winning_bid_id uuid;

do $$
declare c record;
begin
  for c in select conname from pg_constraint where conrelid = 'public.flixi_orders'::regclass and contype = 'c'
           and (pg_get_constraintdef(oid) like '%''matched''%' or pg_get_constraintdef(oid) like '%''bidding''%') loop
    execute format('alter table public.flixi_orders drop constraint %I', c.conname);
  end loop;
  for c in select conname from pg_constraint where conrelid = 'public.flixi_bids'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%client_accepted%' loop
    execute format('alter table public.flixi_bids drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.flixi_orders add constraint flixi_orders_status_check check (status in ('open','matched','in_transit','delivered','cancelled','expired'));
alter table public.flixi_orders add constraint flixi_orders_phase_check check (phase in ('bidding','awaiting_client','closed'));
alter table public.flixi_bids add constraint flixi_bids_status_check check (status in ('pending','won','confirmed','rejected','client_accepted'));

grant insert (depart_date, depart_time) on public.flixi_orders to authenticated;

create or replace function public.flixi_orders_auction_init() returns trigger
language plpgsql as $$
declare dep timestamptz;
begin
  if new.status <> 'open' then new.phase := 'closed'; return new; end if;
  if new.depart_date is null or new.depart_time is null then raise exception 'date de départ requise'; end if;
  dep := flixi_depart_at(new.depart_date, new.depart_time);
  if dep < now() + interval '2 hours' then raise exception 'départ trop proche'; end if;
  new.phase := 'bidding';
  new.auction_round := 1;
  new.auction_ends_at := now() + (dep - now()) / 2;
  return new;
end $$;
create or replace trigger flixi_orders_auction_init_trg before insert on public.flixi_orders for each row execute function public.flixi_orders_auction_init();

-- les offres ne sont possibles que pendant l'enchère
alter policy bids_insert on public.flixi_bids with check (
  driver_id = auth.uid() and public.flixi_is_approved_driver(auth.uid())
  and exists (select 1 from flixi_orders o where o.id = order_id and o.status = 'open' and o.phase = 'bidding' and (o.auction_ends_at is null or o.auction_ends_at > now()))
);
alter policy bids_update on public.flixi_bids
  using (driver_id = auth.uid() and status = 'pending'
         and exists (select 1 from flixi_orders o where o.id = order_id and o.phase = 'bidding' and (o.auction_ends_at is null or o.auction_ends_at > now())))
  with check (driver_id = auth.uid() and status = 'pending');

-- ---------- trajets (annonces des transporteurs) ----------
alter table public.flixi_trips
  add column if not exists auction_ends_at timestamptz,
  add column if not exists auction_round int not null default 1,
  add column if not exists phase text not null default 'bidding',
  add column if not exists winning_bid_id uuid,
  add column if not exists booked_order_id uuid references public.flixi_orders(id) on delete set null;
alter table public.flixi_trips drop constraint if exists flixi_trips_phase_check;
alter table public.flixi_trips add constraint flixi_trips_phase_check check (phase in ('bidding','awaiting_driver','booked','closed'));

create or replace function public.flixi_trips_auction_init() returns trigger
language plpgsql as $$
declare dep timestamptz;
begin
  dep := flixi_depart_at(new.depart_date, new.depart_time);
  if dep < now() + interval '2 hours' then raise exception 'départ trop proche'; end if;
  new.phase := 'bidding';
  new.auction_round := 1;
  new.auction_ends_at := now() + (dep - now()) / 2;
  return new;
end $$;
create or replace trigger flixi_trips_auction_init_trg before insert on public.flixi_trips for each row execute function public.flixi_trips_auction_init();

update public.flixi_trips set auction_ends_at = now() + (flixi_depart_at(depart_date, depart_time) - now()) / 2
  where auction_ends_at is null and status = 'open' and flixi_depart_at(depart_date, depart_time) > now();

create table if not exists public.flixi_trip_bids (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.flixi_trips(id) on delete cascade,
  client_id uuid not null references public.flixi_profiles(id) on delete cascade,
  price int not null check (price >= 1000),
  goods_type text not null,
  description text,
  weight_kg numeric,
  from_address text,
  to_address text,
  status text not null default 'active' check (status in ('active','won','accepted','declined')),
  created_at timestamptz not null default now(),
  unique (trip_id, client_id)
);
alter table public.flixi_trip_bids enable row level security;
revoke all on public.flixi_trip_bids from anon, authenticated;
grant select on public.flixi_trip_bids to authenticated;
create policy trip_bids_select on public.flixi_trip_bids for select to authenticated using (
  client_id = auth.uid() or exists (select 1 from flixi_trips t where t.id = trip_id and t.driver_id = auth.uid())
);

-- ---------- clôture automatique des enchères ----------
create or replace function public.flixi_settle_all() returns void
language plpgsql security definer set search_path = public as $$
declare o record; t record; b record; dep timestamptz;
begin
  -- demandes des clients : le prix le plus BAS gagne
  for o in select * from flixi_orders where status = 'open' and phase = 'bidding' and auction_ends_at is not null and auction_ends_at <= now() for update skip locked loop
    dep := flixi_depart_at(o.depart_date, o.depart_time);
    select * into b from flixi_bids where order_id = o.id and status = 'pending' order by price asc, created_at asc limit 1;
    if b.id is not null then
      update flixi_bids set status = 'won' where id = b.id;
      update flixi_orders set phase = 'awaiting_client', winning_bid_id = b.id where id = o.id;
    elsif dep - now() >= interval '2 hours' then
      update flixi_orders set auction_ends_at = now() + (dep - now()) / 2, auction_round = auction_round + 1 where id = o.id;
    else
      update flixi_orders set status = 'expired', phase = 'closed' where id = o.id;
    end if;
  end loop;
  update flixi_orders set status = 'expired', phase = 'closed'
    where status = 'open' and depart_date is not null and flixi_depart_at(depart_date, depart_time) <= now();

  -- trajets des transporteurs : le prix le plus HAUT gagne
  for t in select * from flixi_trips where status = 'open' and phase = 'bidding' and auction_ends_at is not null and auction_ends_at <= now() for update skip locked loop
    dep := flixi_depart_at(t.depart_date, t.depart_time);
    select * into b from flixi_trip_bids where trip_id = t.id and status = 'active' order by price desc, created_at asc limit 1;
    if b.id is not null then
      update flixi_trip_bids set status = 'won' where id = b.id;
      update flixi_trips set phase = 'awaiting_driver', winning_bid_id = b.id where id = t.id;
    elsif dep - now() >= interval '2 hours' then
      update flixi_trips set auction_ends_at = now() + (dep - now()) / 2, auction_round = auction_round + 1 where id = t.id;
    else
      update flixi_trips set status = 'closed', phase = 'closed' where id = t.id;
    end if;
  end loop;
  update flixi_trips set status = 'closed', phase = 'closed'
    where status = 'open' and phase in ('bidding','awaiting_driver') and flixi_depart_at(depart_date, depart_time) <= now();
end $$;

-- ---------- demandes : actions ----------
-- anciennes fonctions flixi_book_trip / flixi_driver_confirm_bid / flixi_driver_decline_bid : exécution révoquée plus bas

-- Le transporteur accepte le prix du client : « acheter maintenant » (le client doit ensuite confirmer)
create or replace function public.flixi_driver_buy_now(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o flixi_orders; bid uuid;
begin
  perform flixi_settle_all();
  if not flixi_is_approved_driver(auth.uid()) then raise exception 'compte non approuvé'; end if;
  select * into o from flixi_orders where id = p_order and status = 'open' and phase = 'bidding' for update;
  if o.id is null then raise exception 'enchère terminée'; end if;
  insert into flixi_bids (order_id, driver_id, price, note, status) values (o.id, auth.uid(), o.client_price, null, 'won')
  on conflict (order_id, driver_id) do update set price = excluded.price, status = 'won'
  returning id into bid;
  update flixi_orders set phase = 'awaiting_client', winning_bid_id = bid where id = o.id;
end $$;

-- Le client clôture l'enchère tout de suite : la meilleure offre devient gagnante
create or replace function public.flixi_close_auction_now(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update flixi_orders set auction_ends_at = now() where id = p_order and client_id = auth.uid() and status = 'open' and phase = 'bidding';
  if not found then raise exception 'action impossible'; end if;
  perform flixi_settle_all();
end $$;

-- Le client accepte l'offre gagnante : la commande est conclue
create or replace function public.flixi_client_accept_bid(p_bid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o flixi_orders; b flixi_bids;
begin
  select * into b from flixi_bids where id = p_bid and status = 'won';
  if b.id is null then raise exception 'offre introuvable'; end if;
  select * into o from flixi_orders where id = b.order_id and client_id = auth.uid() and status = 'open' and phase = 'awaiting_client' and winning_bid_id = b.id for update;
  if o.id is null then raise exception 'offre introuvable'; end if;
  if not flixi_is_approved_driver(b.driver_id) then raise exception 'compte non approuvé'; end if;
  update flixi_bids set status = 'confirmed' where id = b.id;
  update flixi_bids set status = 'rejected' where order_id = o.id and id <> b.id;
  update flixi_orders set status = 'matched', phase = 'closed', driver_id = b.driver_id, final_price = b.price, matched_at = now() where id = o.id;
  insert into flixi_commissions (order_id, driver_id, amount) values (o.id, b.driver_id, 500) on conflict do nothing;
end $$;

-- Le client refuse le gagnant : l'enchère recommence
create or replace function public.flixi_client_decline_bid(p_bid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o flixi_orders; b flixi_bids; dep timestamptz;
begin
  select * into b from flixi_bids where id = p_bid and status = 'won';
  if b.id is null then raise exception 'offre introuvable'; end if;
  select * into o from flixi_orders where id = b.order_id and client_id = auth.uid() and status = 'open' and phase = 'awaiting_client' for update;
  if o.id is null then raise exception 'offre introuvable'; end if;
  update flixi_bids set status = 'rejected' where id = b.id;
  dep := flixi_depart_at(o.depart_date, o.depart_time);
  if dep - now() >= interval '2 hours' then
    update flixi_orders set phase = 'bidding', winning_bid_id = null, auction_round = auction_round + 1, auction_ends_at = now() + (dep - now()) / 2 where id = o.id;
  else
    update flixi_orders set status = 'expired', phase = 'closed' where id = o.id;
  end if;
end $$;

create or replace function public.flixi_order_bids(p_order uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform flixi_settle_all();
  if not exists (select 1 from flixi_orders where id = p_order and client_id = auth.uid()) then raise exception 'forbidden'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', b.id, 'price', b.price, 'note', b.note, 'status', b.status, 'created_at', b.created_at,
      'driver_first_name', p.first_name, 'vehicle_type', d.vehicle_type, 'wilaya', d.wilaya,
      'deliveries', (select count(*) from flixi_orders o where o.driver_id = p.id and o.status = 'delivered')
    ) order by b.price asc, b.created_at asc), '[]'::jsonb)
    from flixi_bids b join flixi_profiles p on p.id = b.driver_id join flixi_drivers d on d.user_id = p.id
    where b.order_id = p_order and b.status in ('pending','won'));
end $$;

-- Pour les transporteurs : meilleure offre actuelle et nombre d'offres (sans révéler qui)
create or replace function public.flixi_order_stats(p_ids uuid[]) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not flixi_is_approved_driver(auth.uid()) then return '[]'::jsonb; end if;
  perform flixi_settle_all();
  return (select coalesce(jsonb_agg(jsonb_build_object('order_id', o.id, 'best', (select min(price) from flixi_bids b where b.order_id = o.id and b.status in ('pending','won')),
         'count', (select count(*) from flixi_bids b where b.order_id = o.id and b.status in ('pending','won')),
         'phase', o.phase, 'auction_ends_at', o.auction_ends_at, 'round', o.auction_round)), '[]'::jsonb)
    from flixi_orders o where o.id = any(p_ids));
end $$;

-- ---------- trajets : actions ----------
create or replace function public.flixi_trip_bid(
  p_trip uuid, p_price int, p_goods text, p_desc text, p_weight numeric, p_from_addr text, p_to_addr text, p_buy_now boolean
) returns void
language plpgsql security definer set search_path = public as $$
declare t flixi_trips; bid uuid;
begin
  perform flixi_settle_all();
  if not flixi_is_active_client(auth.uid()) then raise exception 'compte client requis'; end if;
  if p_price is null or p_price < 1000 then raise exception 'prix minimum 1000'; end if;
  select * into t from flixi_trips where id = p_trip and status = 'open' and phase = 'bidding' for update;
  if t.id is null then raise exception 'enchère terminée'; end if;
  if not flixi_is_approved_driver(t.driver_id) then raise exception 'trajet indisponible'; end if;
  if p_buy_now and (t.price is null or t.price <> p_price) then raise exception 'prix annoncé requis'; end if;
  insert into flixi_trip_bids (trip_id, client_id, price, goods_type, description, weight_kg, from_address, to_address, status)
  values (t.id, auth.uid(), p_price, p_goods, nullif(p_desc, ''), p_weight, nullif(p_from_addr, ''), nullif(p_to_addr, ''), case when p_buy_now then 'won' else 'active' end)
  on conflict (trip_id, client_id) do update set price = excluded.price, goods_type = excluded.goods_type, description = excluded.description,
    weight_kg = excluded.weight_kg, from_address = excluded.from_address, to_address = excluded.to_address,
    status = case when p_buy_now then 'won' else 'active' end, created_at = now()
  returning id into bid;
  if p_buy_now then
    update flixi_trips set phase = 'awaiting_driver', winning_bid_id = bid where id = t.id;
  end if;
end $$;

create or replace function public.flixi_trip_withdraw_bid(p_trip uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from flixi_trip_bids where trip_id = p_trip and client_id = auth.uid() and status = 'active';
end $$;

create or replace function public.flixi_trip_close_now(p_trip uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update flixi_trips set auction_ends_at = now() where id = p_trip and driver_id = auth.uid() and status = 'open' and phase = 'bidding';
  if not found then raise exception 'action impossible'; end if;
  perform flixi_settle_all();
end $$;

-- Le transporteur accepte le client gagnant : une commande conclue est créée
create or replace function public.flixi_trip_accept_winner(p_trip uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare t flixi_trips; b flixi_trip_bids; oid uuid;
begin
  select * into t from flixi_trips where id = p_trip and driver_id = auth.uid() and status = 'open' and phase = 'awaiting_driver' for update;
  if t.id is null then raise exception 'action impossible'; end if;
  if not flixi_is_approved_driver(auth.uid()) then raise exception 'compte non approuvé'; end if;
  select * into b from flixi_trip_bids where id = t.winning_bid_id and status = 'won';
  if b.id is null then raise exception 'offre introuvable'; end if;
  insert into flixi_orders (client_id, goods_type, description, weight_kg, from_wilaya, from_address, to_wilaya, to_address,
                            client_price, status, driver_id, final_price, matched_at, depart_date, depart_time, trip_id, phase)
  values (b.client_id, b.goods_type, b.description, b.weight_kg, t.from_wilaya, b.from_address, t.to_wilaya, b.to_address,
          b.price, 'matched', t.driver_id, b.price, now(), t.depart_date, t.depart_time, t.id, 'closed')
  returning id into oid;
  insert into flixi_commissions (order_id, driver_id, amount) values (oid, t.driver_id, 500) on conflict do nothing;
  update flixi_trip_bids set status = 'accepted' where id = b.id;
  update flixi_trip_bids set status = 'declined' where trip_id = t.id and id <> b.id and status = 'active';
  update flixi_trips set phase = 'booked', status = 'closed', booked_order_id = oid where id = t.id;
  return oid;
end $$;

-- Le transporteur refuse le gagnant : l'enchère recommence
create or replace function public.flixi_trip_decline_winner(p_trip uuid) returns void
language plpgsql security definer set search_path = public as $$
declare t flixi_trips; dep timestamptz;
begin
  select * into t from flixi_trips where id = p_trip and driver_id = auth.uid() and status = 'open' and phase = 'awaiting_driver' for update;
  if t.id is null then raise exception 'action impossible'; end if;
  update flixi_trip_bids set status = 'declined' where id = t.winning_bid_id;
  dep := flixi_depart_at(t.depart_date, t.depart_time);
  if dep - now() >= interval '2 hours' then
    update flixi_trips set phase = 'bidding', winning_bid_id = null, auction_round = auction_round + 1, auction_ends_at = now() + (dep - now()) / 2 where id = t.id;
  else
    update flixi_trips set status = 'closed', phase = 'closed' where id = t.id;
  end if;
end $$;

-- Liste publique des trajets (clients ET transporteurs) avec l'état de l'enchère
create or replace function public.flixi_available_trips() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return '[]'::jsonb; end if;
  perform flixi_settle_all();
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id, 'from_wilaya', t.from_wilaya, 'to_wilaya', t.to_wilaya, 'depart_date', t.depart_date, 'depart_time', t.depart_time,
    'price', t.price, 'note', t.note, 'driver_first_name', p.first_name, 'vehicle_type', d.vehicle_type,
    'deliveries', (select count(*) from flixi_orders o where o.driver_id = p.id and o.status = 'delivered'),
    'phase', t.phase, 'auction_ends_at', t.auction_ends_at, 'round', t.auction_round, 'is_mine', t.driver_id = auth.uid(),
    'best', (select max(b.price) from flixi_trip_bids b where b.trip_id = t.id and b.status in ('active','won')),
    'bids', (select count(*) from flixi_trip_bids b where b.trip_id = t.id and b.status in ('active','won')),
    'my_bid', (select jsonb_build_object('price', b.price, 'status', b.status) from flixi_trip_bids b where b.trip_id = t.id and b.client_id = auth.uid())
  ) order by t.depart_date, t.depart_time), '[]'::jsonb)
  from flixi_trips t join flixi_profiles p on p.id = t.driver_id join flixi_drivers d on d.user_id = p.id
  where t.status = 'open' and t.phase in ('bidding','awaiting_driver') and p.status = 'active' and d.approval = 'approved');
end $$;

-- Mes enchères sur des trajets (client)
create or replace function public.flixi_my_trip_bids() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform flixi_settle_all();
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id, 'price', b.price, 'status', b.status, 'goods_type', b.goods_type, 'created_at', b.created_at,
    'trip_id', t.id, 'from_wilaya', t.from_wilaya, 'to_wilaya', t.to_wilaya, 'depart_date', t.depart_date, 'depart_time', t.depart_time,
    'phase', t.phase, 'trip_status', t.status, 'auction_ends_at', t.auction_ends_at, 'order_id', t.booked_order_id,
    'driver_first_name', p.first_name,
    'best', (select max(x.price) from flixi_trip_bids x where x.trip_id = t.id and x.status in ('active','won'))
  ) order by b.created_at desc), '[]'::jsonb)
  from flixi_trip_bids b join flixi_trips t on t.id = b.trip_id join flixi_profiles p on p.id = t.driver_id
  where b.client_id = auth.uid());
end $$;

-- Mes trajets (transporteur) avec les offres reçues
create or replace function public.flixi_my_trips_overview() returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  perform flixi_settle_all();
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id, 'from_wilaya', t.from_wilaya, 'to_wilaya', t.to_wilaya, 'depart_date', t.depart_date, 'depart_time', t.depart_time,
    'price', t.price, 'note', t.note, 'status', t.status, 'phase', t.phase, 'auction_ends_at', t.auction_ends_at, 'round', t.auction_round,
    'winning_bid_id', t.winning_bid_id, 'booked_order_id', t.booked_order_id,
    'bids', (select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'price', b.price, 'status', b.status, 'goods_type', b.goods_type,
               'description', b.description, 'weight_kg', b.weight_kg, 'client_first_name', c.first_name) order by b.price desc, b.created_at asc), '[]'::jsonb)
             from flixi_trip_bids b join flixi_profiles c on c.id = b.client_id where b.trip_id = t.id and b.status in ('active','won','accepted'))
  ) order by t.depart_date desc, t.depart_time desc), '[]'::jsonb)
  from flixi_trips t where t.driver_id = auth.uid());
end $$;

-- ---------- droits ----------
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('flixi_settle_all','flixi_driver_buy_now','flixi_close_auction_now','flixi_client_accept_bid','flixi_client_decline_bid',
             'flixi_order_bids','flixi_order_stats','flixi_trip_bid','flixi_trip_withdraw_bid','flixi_trip_close_now','flixi_trip_accept_winner','flixi_trip_decline_winner',
             'flixi_available_trips','flixi_my_trip_bids','flixi_my_trips_overview')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('flixi_book_trip','flixi_driver_confirm_bid','flixi_driver_decline_bid')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

-- Clôture automatique chaque minute (en plus de la clôture à chaque consultation)
create extension if not exists pg_cron;
select cron.schedule('flixi-settle-auctions', '* * * * *', $$select public.flixi_settle_all()$$);

-- ---------- reprise des données existantes ----------
update public.flixi_orders set phase = 'closed' where status <> 'open';
-- anciennes réservations directes -> offres d'enchère sur le trajet
insert into public.flixi_trip_bids (trip_id, client_id, price, goods_type, description, weight_kg, from_address, to_address, status)
  select o.trip_id, o.client_id, o.client_price, o.goods_type, o.description, o.weight_kg, o.from_address, o.to_address, 'active'
  from public.flixi_orders o join public.flixi_trips t on t.id = o.trip_id
  where o.status = 'open' and o.direct_driver_id is not null and t.status = 'open'
  on conflict (trip_id, client_id) do nothing;
update public.flixi_bids set status = 'rejected' where order_id in (select id from public.flixi_orders where status = 'open' and direct_driver_id is not null);
update public.flixi_orders set status = 'cancelled', phase = 'closed' where status = 'open' and direct_driver_id is not null;
-- autres demandes ouvertes sans date : départ dans 3 jours
update public.flixi_orders set depart_date = current_date + 3, depart_time = '08:00',
  auction_ends_at = now() + (flixi_depart_at(current_date + 3, '08:00') - now()) / 2
  where status = 'open' and depart_date is null;
update public.flixi_bids set status = 'pending' where status = 'client_accepted';
