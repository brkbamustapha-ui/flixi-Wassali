-- Réservation directe d'un trajet de transporteur par un client
alter table public.flixi_orders
  add column if not exists direct_driver_id uuid references public.flixi_profiles(id) on delete set null,
  add column if not exists trip_id uuid references public.flixi_trips(id) on delete set null;

drop policy if exists orders_select on public.flixi_orders;
create policy orders_select on public.flixi_orders for select to authenticated using (
  client_id = auth.uid() or driver_id = auth.uid() or direct_driver_id = auth.uid()
  or (status = 'open' and direct_driver_id is null and public.flixi_is_approved_driver(auth.uid()))
);

create or replace function public.flixi_book_trip(
  p_trip uuid, p_goods text, p_desc text, p_weight numeric, p_from_addr text, p_to_addr text, p_price int,
  p_from_lat double precision, p_from_lng double precision, p_to_lat double precision, p_to_lng double precision
) returns uuid
language plpgsql security definer set search_path = public as $$
declare t flixi_trips; oid uuid;
begin
  if not flixi_is_active_client(auth.uid()) then raise exception 'compte client requis'; end if;
  if p_price is null or p_price < 1000 then raise exception 'prix minimum 1000'; end if;
  select * into t from flixi_trips where id = p_trip and status = 'open' and depart_date >= current_date;
  if t.id is null then raise exception 'trajet indisponible'; end if;
  if not flixi_is_approved_driver(t.driver_id) then raise exception 'trajet indisponible'; end if;
  insert into flixi_orders (client_id, goods_type, description, weight_kg, from_wilaya, from_address, from_lat, from_lng,
                            to_wilaya, to_address, to_lat, to_lng, client_price, direct_driver_id, trip_id)
  values (auth.uid(), p_goods, nullif(p_desc, ''), p_weight, t.from_wilaya, nullif(p_from_addr, ''), p_from_lat, p_from_lng,
          t.to_wilaya, nullif(p_to_addr, ''), p_to_lat, p_to_lng, p_price, t.driver_id, t.id)
  returning id into oid;
  -- le client a déjà accepté : le transporteur doit maintenant confirmer
  insert into flixi_bids (order_id, driver_id, price, note, status)
  values (oid, t.driver_id, p_price, 'Réservation de votre trajet', 'client_accepted');
  return oid;
end $$;

-- Si le transporteur refuse une réservation directe, la commande s'ouvre à tous les transporteurs
create or replace function public.flixi_driver_decline_bid(p_bid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_order uuid;
begin
  update flixi_bids set status = 'rejected' where id = p_bid and driver_id = auth.uid() and status = 'client_accepted'
  returning order_id into v_order;
  if v_order is not null then
    update flixi_orders set direct_driver_id = null where id = v_order and direct_driver_id = auth.uid() and status = 'open';
  end if;
end $$;

revoke execute on function public.flixi_book_trip(uuid, text, text, numeric, text, text, int, double precision, double precision, double precision, double precision) from public, anon, authenticated;
grant execute on function public.flixi_book_trip(uuid, text, text, numeric, text, text, int, double precision, double precision, double precision, double precision) to authenticated;
revoke execute on function public.flixi_driver_decline_bid(uuid) from public, anon;
grant execute on function public.flixi_driver_decline_bid(uuid) to authenticated;
