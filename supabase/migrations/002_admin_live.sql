create or replace function public.flixi_admin_live(s text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform flixi_admin_check(s);
  return (select coalesce(jsonb_agg(jsonb_build_object(
    'id', o.id, 'status', o.status, 'goods_type', o.goods_type, 'from_wilaya', o.from_wilaya, 'to_wilaya', o.to_wilaya,
    'from_lat', o.from_lat, 'from_lng', o.from_lng, 'to_lat', o.to_lat, 'to_lng', o.to_lng,
    'driver_name', d.first_name || ' ' || d.last_name, 'driver_phone', d.phone,
    'client_name', c.first_name || ' ' || c.last_name,
    'lat', l.lat, 'lng', l.lng, 'updated_at', l.updated_at)), '[]'::jsonb)
  from flixi_orders o
  join flixi_profiles c on c.id = o.client_id
  join flixi_profiles d on d.id = o.driver_id
  left join flixi_locations l on l.order_id = o.id
  where o.status in ('matched','in_transit'));
end $$;
revoke execute on function public.flixi_admin_live(text) from public, anon, authenticated;
grant execute on function public.flixi_admin_live(text) to anon, authenticated;
