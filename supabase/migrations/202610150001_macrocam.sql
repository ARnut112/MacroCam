-- MacroCam: run in a NEW Supabase project, never in the existing shop database.
-- The application server owns all access; no customer data is browser-readable.
begin;

create schema if not exists macrocam_private;
revoke all on schema macrocam_private from public, anon, authenticated, service_role;

create type public.order_status as enum (
  'awaiting_payment', 'slip_submitted', 'paid', 'shipped', 'completed', 'cancelled', 'expired'
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,159}$'),
  name text not null check (char_length(name) between 1 and 200),
  brand text not null default '' check (char_length(brand) <= 100),
  model text not null default '' check (char_length(model) <= 150),
  category text not null check (category in ('cameras', 'lenses', 'lighting', 'tripods', 'accessories')),
  condition text not null check (condition in ('new', 'used')),
  condition_label text not null default '' check (char_length(condition_label) <= 100),
  price numeric(12,2) not null check (price > 0),
  original_price numeric(12,2) check (original_price > 0),
  -- Admin input is capped by the API; releasing existing reservations can exceed it.
  stock integer not null default 0 check (stock >= 0),
  published boolean not null default false,
  description text not null default '' check (char_length(description) <= 12000),
  tagline text not null default '' check (char_length(tagline) <= 300),
  badge text not null default '' check (char_length(badge) <= 80),
  condition_notes text not null default '' check (char_length(condition_notes) <= 4000),
  tested_notes text not null default '' check (char_length(tested_notes) <= 4000),
  defects text not null default '' check (char_length(defects) <= 4000),
  included_items text[] not null default '{}',
  warranty text not null default '' check (char_length(warranty) <= 4000),
  mount text not null default '' check (char_length(mount) <= 100),
  specs jsonb not null default '{}' check (jsonb_typeof(specs) = 'object'),
  images text[] not null default '{}',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_published_category_idx on public.products (published, category, created_at desc);

create table public.store_settings (
  singleton boolean primary key default true check (singleton),
  store_name text not null default 'MacroCam' check (char_length(store_name) between 1 and 100),
  payment_qr_url text check (payment_qr_url is null or char_length(payment_qr_url) <= 2048),
  payment_account text check (payment_account is null or char_length(payment_account) <= 1000),
  shipping_policy text check (shipping_policy is null or char_length(shipping_policy) <= 12000),
  return_policy text check (return_policy is null or char_length(return_policy) <= 12000),
  privacy_policy text check (privacy_policy is null or char_length(privacy_policy) <= 12000),
  warranty_policy text check (warranty_policy is null or char_length(warranty_policy) <= 12000),
  updated_at timestamptz not null default now()
);
insert into public.store_settings (singleton) values (true);

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  status public.order_status not null default 'awaiting_payment',
  recipient_name text not null check (char_length(recipient_name) between 2 and 120),
  phone text not null check (phone ~ '^0[0-9]{8,9}$'),
  address text not null check (char_length(address) between 10 and 1500),
  note text not null default '' check (char_length(note) <= 1500),
  total numeric(16,2) not null check (total > 0),
  idempotency_key uuid not null unique,
  customer_fingerprint text not null check (char_length(customer_fingerprint) between 1 and 200),
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null default (now() + interval '1 hour'),
  slip_path text check (slip_path is null or char_length(slip_path) <= 500),
  shipping_company text check (shipping_company is null or char_length(shipping_company) <= 100),
  tracking_number text check (tracking_number is null or char_length(tracking_number) <= 100),
  stock_released boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status not in ('slip_submitted', 'paid', 'shipped', 'completed') or slip_path is not null),
  check (status not in ('shipped', 'completed') or
    (nullif(btrim(shipping_company), '') is not null and nullif(btrim(tracking_number), '') is not null)),
  check (not stock_released or status in ('cancelled', 'expired'))
);
create index orders_pending_expiry_idx on public.orders (expires_at, id) where status = 'awaiting_payment';
create index orders_status_created_idx on public.orders (status, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  name text not null,
  slug text not null,
  brand text not null,
  price numeric(12,2) not null check (price > 0),
  quantity integer not null check (quantity between 1 and 99),
  image text,
  unique (order_id, product_id)
);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.orders(id) on delete restrict,
  from_status public.order_status,
  to_status public.order_status not null,
  actor_id uuid references auth.users(id) on delete set null,
  actor_kind text not null check (actor_kind in ('customer', 'admin', 'system')),
  details jsonb not null default '{}' check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

create table public.rate_limits (
  key text primary key check (char_length(key) between 1 and 300),
  window_start timestamptz not null,
  count integer not null check (count > 0),
  expires_at timestamptz not null
);
create index rate_limits_expires_idx on public.rate_limits (expires_at);

-- This is a deployment marker; cron is deliberately not installed by migration.
-- Requests still expire overdue reservations transactionally.
create table public.runtime_config (
  singleton boolean primary key default true check (singleton),
  order_expiry_minutes integer not null default 60 check (order_expiry_minutes = 60),
  scheduled_expiry_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into public.runtime_config (singleton) values (true);

create function macrocam_private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
create trigger products_touch before update on public.products for each row execute function macrocam_private.touch_updated_at();
create trigger settings_touch before update on public.store_settings for each row execute function macrocam_private.touch_updated_at();
create trigger orders_touch before update on public.orders for each row execute function macrocam_private.touch_updated_at();
create trigger config_touch before update on public.runtime_config for each row execute function macrocam_private.touch_updated_at();

-- Caller must already own the order row lock and every affected product row lock.
create function macrocam_private.release_stock(p_order_id uuid) returns void
language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.orders where id = p_order_id and not stock_released) then
    update public.products p set stock = p.stock + i.quantity
    from public.order_items i where i.order_id = p_order_id and i.product_id = p.id;
    update public.orders set stock_released = true where id = p_order_id;
  end if;
end;
$$;

-- The order and product locks have been acquired by the public caller in order.
create function macrocam_private.expire_locked(p_ids uuid[]) returns integer
language plpgsql set search_path = '' as $$
declare
  v_id uuid;
  v_count integer := 0;
begin
  foreach v_id in array p_ids loop
    if exists (select 1 from public.orders where id = v_id and status = 'awaiting_payment' and expires_at <= clock_timestamp()) then
      update public.orders set status = 'expired' where id = v_id;
      perform macrocam_private.release_stock(v_id);
      insert into public.order_events (order_id, from_status, to_status, actor_kind)
      values (v_id, 'awaiting_payment', 'expired', 'system');
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

create function public.expire_orders() returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_expired uuid[];
  v_count integer;
begin
  select coalesce(array_agg(q.id order by q.id), '{}'::uuid[]) into v_expired
  from (select id from public.orders where status = 'awaiting_payment' and expires_at <= clock_timestamp()
    order by id limit 500 for update skip locked) q;
  perform p.id from public.products p where p.id in
    (select product_id from public.order_items where order_id = any(v_expired)) order by p.id for update;
  v_count := macrocam_private.expire_locked(v_expired);
  delete from public.rate_limits where expires_at < now() - interval '1 day';
  return v_count;
end;
$$;

create function public.create_order(p_payload jsonb, p_idempotency_key uuid, p_customer_fingerprint text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_name text;
  v_phone text;
  v_address text;
  v_note text;
  v_items jsonb;
  v_hash text;
  v_order public.orders%rowtype;
  v_item jsonb;
  v_product public.products%rowtype;
  v_expired uuid[];
  v_total numeric(16,2) := 0;
  v_quantity integer;
  v_number text;
  v_created_at timestamptz;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 32000
    or p_idempotency_key is null or nullif(btrim(p_customer_fingerprint), '') is null
    or char_length(p_customer_fingerprint) > 200 then
    raise exception 'INVALID_INPUT' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_payload -> 'recipient_name') is distinct from 'string'
    or jsonb_typeof(p_payload -> 'phone') is distinct from 'string'
    or jsonb_typeof(p_payload -> 'address') is distinct from 'string'
    or (p_payload ? 'note' and jsonb_typeof(p_payload -> 'note') <> 'string')
    or jsonb_typeof(p_payload -> 'items') is distinct from 'array' then
    raise exception 'INVALID_INPUT' using errcode = 'P0001';
  end if;
  v_name := btrim(p_payload ->> 'recipient_name');
  v_phone := regexp_replace(btrim(p_payload ->> 'phone'), '[[:space:]()-]', '', 'g');
  if left(v_phone, 3) = '+66' then v_phone := '0' || substring(v_phone from 4); end if;
  v_address := btrim(p_payload ->> 'address');
  v_note := btrim(coalesce(p_payload ->> 'note', ''));
  if char_length(v_name) not between 2 and 120 or v_phone !~ '^0[0-9]{8,9}$'
    or char_length(v_address) not between 10 and 1500 or char_length(v_note) > 1500
    or jsonb_array_length(p_payload -> 'items') not between 1 and 50 then
    raise exception 'INVALID_INPUT' using errcode = 'P0001';
  end if;
  for v_item in select value from jsonb_array_elements(p_payload -> 'items') loop
    if jsonb_typeof(v_item) <> 'object' or jsonb_typeof(v_item -> 'product_id') is distinct from 'string'
      or (v_item ->> 'product_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or jsonb_typeof(v_item -> 'quantity') is distinct from 'number'
      or (v_item ->> 'quantity') !~ '^[1-9][0-9]?$' then
      raise exception 'INVALID_INPUT' using errcode = 'P0001';
    end if;
  end loop;
  select jsonb_agg(jsonb_build_object('product_id', q.product_id, 'quantity', q.quantity) order by q.product_id)
  into v_items from (
    select (value ->> 'product_id')::uuid product_id, sum((value ->> 'quantity')::integer) quantity
    from jsonb_array_elements(p_payload -> 'items') group by (value ->> 'product_id')::uuid
  ) q;
  if exists (select 1 from jsonb_array_elements(v_items) where (value ->> 'quantity')::integer > 99) then
    raise exception 'INVALID_INPUT' using errcode = 'P0001';
  end if;
  v_hash := encode(sha256(convert_to(jsonb_build_object('recipient_name', v_name, 'phone', v_phone,
    'address', v_address, 'note', v_note, 'items', v_items)::text, 'UTF8')), 'hex');

  -- Serialize one idempotency key, including the first request before its row exists.
  perform pg_advisory_xact_lock(hashtextextended('macrocam-order:' || p_idempotency_key::text, 0));
  select * into v_order from public.orders where idempotency_key = p_idempotency_key for update;
  if found then
    if v_order.customer_fingerprint <> p_customer_fingerprint or v_order.request_hash <> v_hash then
      raise exception 'IDEMPOTENCY_CONFLICT' using errcode = 'P0001';
    end if;
    if v_order.status = 'awaiting_payment' and v_order.expires_at <= clock_timestamp() then
      perform p.id from public.products p where p.id in
        (select product_id from public.order_items where order_id = v_order.id) order by p.id for update;
      perform macrocam_private.expire_locked(array[v_order.id]);
      select * into v_order from public.orders where id = v_order.id;
    end if;
    return to_jsonb(v_order);
  end if;
  -- Hold the confirmed payment/policy settings until this checkout commits.
  perform singleton from public.store_settings where singleton
    and nullif(btrim(payment_qr_url), '') is not null and nullif(btrim(payment_account), '') is not null
    and nullif(btrim(shipping_policy), '') is not null and nullif(btrim(return_policy), '') is not null
    and nullif(btrim(privacy_policy), '') is not null and nullif(btrim(warranty_policy), '') is not null for share;
  if not found then
    raise exception 'PAYMENT_NOT_CONFIGURED' using errcode = 'P0001';
  end if;

  -- Acquire all order locks first, then the union of affected products in UUID order.
  -- Holding expiry stock locks and later acquiring unsorted cart locks can deadlock.
  select coalesce(array_agg(q.id order by q.id), '{}'::uuid[]) into v_expired
  from (select id from public.orders where status = 'awaiting_payment' and expires_at <= clock_timestamp()
    order by id limit 500 for update skip locked) q;
  perform p.id from public.products p where p.id in (
    select product_id from public.order_items where order_id = any(v_expired)
    union select (value ->> 'product_id')::uuid from jsonb_array_elements(v_items)
  ) order by p.id for update;
  perform macrocam_private.expire_locked(v_expired);
  for v_item in select value from jsonb_array_elements(v_items) loop
    v_quantity := (v_item ->> 'quantity')::integer;
    select * into v_product from public.products where id = (v_item ->> 'product_id')::uuid;
    if not found or not v_product.published or v_product.stock < v_quantity then
      raise exception 'STOCK_UNAVAILABLE' using errcode = 'P0001';
    end if;
    v_total := v_total + v_product.price * v_quantity;
  end loop;
  -- 128 random bits plus a unique constraint; no phone, timestamp, or sequence leak.
  v_number := 'MC-' || upper(replace(gen_random_uuid()::text, '-', ''));
  v_created_at := clock_timestamp();
  insert into public.orders (order_number, recipient_name, phone, address, note, total,
    idempotency_key, customer_fingerprint, request_hash, created_at, updated_at, expires_at)
  values (v_number, v_name, v_phone, v_address, v_note, v_total, p_idempotency_key,
    p_customer_fingerprint, v_hash, v_created_at, v_created_at, v_created_at + interval '1 hour') returning * into v_order;
  for v_item in select value from jsonb_array_elements(v_items) loop
    select * into v_product from public.products where id = (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;
    insert into public.order_items (order_id, product_id, name, slug, brand, price, quantity, image)
    values (v_order.id, v_product.id, v_product.name, v_product.slug, v_product.brand,
      v_product.price, v_quantity, v_product.images[1]);
    update public.products set stock = stock - v_quantity where id = v_product.id;
  end loop;
  insert into public.order_events (order_id, to_status, actor_kind)
  values (v_order.id, 'awaiting_payment', 'customer');
  return to_jsonb(v_order);
end;
$$;

create function public.attach_slip(p_order_id uuid, p_slip_path text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype;
begin
  if p_order_id is null or nullif(btrim(p_slip_path), '') is null or char_length(p_slip_path) > 500
    or p_slip_path not like p_order_id::text || '/%'
    or p_slip_path ~ '(^|/)\.\.(/|$)' then
    raise exception 'INVALID_INPUT' using errcode = 'P0001';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001'; end if;
  -- A concurrent duplicate upload keeps the first accepted file, never replaces it.
  if v_order.status = 'slip_submitted' then return to_jsonb(v_order); end if;
  if v_order.status = 'expired' or (v_order.status = 'awaiting_payment' and v_order.expires_at <= clock_timestamp()) then
    raise exception 'ORDER_EXPIRED' using errcode = 'P0001';
  end if;
  if v_order.status <> 'awaiting_payment' then raise exception 'INVALID_TRANSITION' using errcode = 'P0001'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'slips' and name = p_slip_path) then
    raise exception 'INVALID_INPUT' using errcode = 'P0001';
  end if;
  update public.orders set status = 'slip_submitted', slip_path = p_slip_path where id = p_order_id returning * into v_order;
  insert into public.order_events (order_id, from_status, to_status, actor_kind)
  values (p_order_id, 'awaiting_payment', 'slip_submitted', 'customer');
  return to_jsonb(v_order);
end;
$$;

create function public.transition_order(p_order_id uuid, p_status text, p_actor_id uuid,
  p_shipping_company text default null, p_tracking_number text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype;
  v_previous public.order_status;
begin
  if p_actor_id is null or not exists (select 1 from public.admin_users where user_id = p_actor_id) then
    raise exception 'FORBIDDEN' using errcode = 'P0001';
  end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001'; end if;
  if p_status not in ('paid', 'shipped', 'completed', 'cancelled') or p_status is null then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001';
  end if;
  if v_order.status::text = p_status then return to_jsonb(v_order); end if;
  if not ((v_order.status = 'slip_submitted' and p_status = 'paid' and v_order.slip_path is not null)
    or (v_order.status = 'paid' and p_status = 'shipped')
    or (v_order.status = 'shipped' and p_status = 'completed')
    or (v_order.status in ('awaiting_payment', 'slip_submitted', 'paid') and p_status = 'cancelled')) then
    raise exception 'INVALID_TRANSITION' using errcode = 'P0001';
  end if;
  if p_status = 'shipped' and (nullif(btrim(p_shipping_company), '') is null
    or nullif(btrim(p_tracking_number), '') is null or char_length(p_shipping_company) > 100
    or char_length(p_tracking_number) > 100) then
    raise exception 'INVALID_INPUT' using errcode = 'P0001';
  end if;
  v_previous := v_order.status;
  update public.orders set status = p_status::public.order_status,
    shipping_company = case when p_status = 'shipped' then btrim(p_shipping_company) else shipping_company end,
    tracking_number = case when p_status = 'shipped' then btrim(p_tracking_number) else tracking_number end
  where id = p_order_id;
  if p_status = 'cancelled' then
    perform p.id from public.products p where p.id in
      (select product_id from public.order_items where order_id = p_order_id) order by p.id for update;
    perform macrocam_private.release_stock(p_order_id);
  end if;
  insert into public.order_events (order_id, from_status, to_status, actor_id, actor_kind, details)
  values (p_order_id, v_previous, p_status::public.order_status, p_actor_id, 'admin',
    case when p_status = 'shipped' then jsonb_build_object('shipping_company', btrim(p_shipping_company),
      'tracking_number', btrim(p_tracking_number)) else '{}'::jsonb end);
  select * into v_order from public.orders where id = p_order_id;
  return to_jsonb(v_order);
end;
$$;

create function public.complete_order(p_order_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001'; end if;
  if v_order.status = 'completed' then return to_jsonb(v_order); end if;
  if v_order.status <> 'shipped' then raise exception 'INVALID_TRANSITION' using errcode = 'P0001'; end if;
  update public.orders set status = 'completed' where id = p_order_id returning * into v_order;
  insert into public.order_events (order_id, from_status, to_status, actor_kind)
  values (p_order_id, 'shipped', 'completed', 'customer');
  return to_jsonb(v_order);
end;
$$;

create function public.consume_rate_limit(p_key text, p_limit integer default 10, p_window_seconds integer default 900)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
  v_now timestamptz := clock_timestamp();
begin
  if nullif(btrim(p_key), '') is null or char_length(p_key) > 300
    or p_limit is null or p_limit not between 1 and 1000
    or p_window_seconds is null or p_window_seconds not between 1 and 86400 then
    raise exception 'INVALID_INPUT' using errcode = 'P0001';
  end if;
  insert into public.rate_limits as existing (key, window_start, count, expires_at)
  values (p_key, v_now, 1, v_now + make_interval(secs => p_window_seconds))
  on conflict (key) do update set
    window_start = case when existing.expires_at <= v_now then v_now else existing.window_start end,
    count = case when existing.expires_at <= v_now then 1 else least(existing.count + 1, p_limit + 1) end,
    expires_at = case when existing.expires_at <= v_now then v_now + make_interval(secs => p_window_seconds) else existing.expires_at end
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;

-- Reject client SDK access even if a future endpoint accidentally uses anon auth.
alter table public.products enable row level security;
alter table public.store_settings enable row level security;
alter table public.admin_users enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_events enable row level security;
alter table public.rate_limits enable row level security;
alter table public.runtime_config enable row level security;
alter table public.products force row level security;
alter table public.store_settings force row level security;
alter table public.admin_users force row level security;
alter table public.orders force row level security;
alter table public.order_items force row level security;
alter table public.order_events force row level security;
alter table public.rate_limits force row level security;
alter table public.runtime_config force row level security;

revoke all on table public.products, public.store_settings, public.admin_users, public.orders,
  public.order_items, public.order_events, public.rate_limits, public.runtime_config from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.products to service_role;
grant select, insert, update on public.store_settings, public.admin_users, public.runtime_config to service_role;
grant select on public.orders, public.order_items, public.order_events to service_role;
grant usage, select on sequence public.order_events_id_seq to service_role;

revoke all on function public.create_order(jsonb, uuid, text), public.expire_orders(),
  public.attach_slip(uuid, text), public.transition_order(uuid, text, uuid, text, text),
  public.complete_order(uuid), public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.create_order(jsonb, uuid, text), public.expire_orders(),
  public.attach_slip(uuid, text), public.transition_order(uuid, text, uuid, text, text),
  public.complete_order(uuid), public.consume_rate_limit(text, integer, integer) to service_role;
revoke all on all functions in schema macrocam_private from public, anon, authenticated, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('slips', 'slips', false, 4194304, array['image/jpeg', 'image/png', 'image/webp']),
  ('store-assets', 'store-assets', true, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- The only anonymous storage permission is reading explicitly public store images.
create policy macrocam_public_store_assets on storage.objects for select to anon, authenticated
using (bucket_id = 'store-assets');
-- No client policies are created for slips or for upload/update/delete operations.

commit;
