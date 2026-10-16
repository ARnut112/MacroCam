-- Run AFTER the migration in a disposable local/test Supabase database only.
-- No real order, payment, image, or customer is created. Everything rolls back.
begin;

do $$
declare
  v_product uuid := gen_random_uuid();
  v_admin uuid := gen_random_uuid();
  v_key uuid := gen_random_uuid();
  v_payload jsonb;
  v_order jsonb;
  v_second jsonb;
  v_order_id uuid;
  v_stock integer;
  v_slip text;
  v_count integer;
  v_product_version timestamptz;
  v_rows integer;
  v_allowed boolean;
begin
  if has_table_privilege('anon', 'public.orders', 'select')
    or has_table_privilege('authenticated', 'public.orders', 'select')
    or has_function_privilege('anon', 'public.create_order(jsonb,uuid,text)', 'execute')
    or has_function_privilege('authenticated', 'public.attach_slip(uuid,text)', 'execute')
    or has_table_privilege('service_role', 'public.orders', 'update') then
    raise exception 'FAIL: browser access or direct order mutations are permitted';
  end if;
  if (select public from storage.buckets where id = 'slips') then
    raise exception 'FAIL: slips bucket must be private';
  end if;
  if (select count(*) from storage.buckets where id in ('slips','store-assets') and file_size_limit = 4194304) <> 2 then
    raise exception 'FAIL: image buckets must enforce 4 MiB file limits';
  end if;
  if (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname in ('products', 'store_settings', 'admin_users',
      'orders', 'order_items', 'order_events', 'rate_limits', 'runtime_config')
      and c.relrowsecurity and c.relforcerowsecurity) <> 8 then
    raise exception 'FAIL: RLS must be enabled and forced on every app table';
  end if;

  insert into auth.users (id, email) values (v_admin, 'macrocam-test-only@example.invalid');
  insert into public.admin_users (user_id) values (v_admin);
  insert into public.products (id, slug, name, brand, category, condition, price, stock, published, updated_at)
  values (v_product, 'test-' || v_product, 'SQL test camera', 'Test', 'cameras', 'used', 1234.50, 2, true, now() - interval '1 minute');
  select updated_at into v_product_version from public.products where id = v_product;
  v_payload := jsonb_build_object('recipient_name', 'Test recipient', 'phone', '080-000-0000',
    'address', 'Test only address 12345', 'note', '', 'items',
    jsonb_build_array(jsonb_build_object('product_id', v_product, 'quantity', 1, 'price', 0.01)));

  update public.store_settings set payment_qr_url = null;
  begin
    perform public.create_order(v_payload, v_key, 'customer-test');
    raise exception 'FAIL: unconfigured payment accepted';
  exception when raise_exception then
    if sqlerrm <> 'PAYMENT_NOT_CONFIGURED' then raise; end if;
  end;
  update public.store_settings set payment_qr_url = 'https://example.invalid/test-qr.png',
    payment_account = 'TEST ONLY - not a real bank account', shipping_policy = 'TEST ONLY',
    return_policy = 'TEST ONLY', privacy_policy = 'TEST ONLY', warranty_policy = 'TEST ONLY';
  update public.store_settings set privacy_policy = null;
  begin
    perform public.create_order(v_payload, v_key, 'customer-test');
    raise exception 'FAIL: missing confirmed policy accepted';
  exception when raise_exception then
    if sqlerrm <> 'PAYMENT_NOT_CONFIGURED' then raise; end if;
  end;
  update public.store_settings set privacy_policy = 'TEST ONLY';

  v_order := public.create_order(v_payload, v_key, 'customer-test');
  v_order_id := (v_order ->> 'id')::uuid;
  if (v_order ->> 'total')::numeric <> 1234.50 or v_order ->> 'phone' <> '0800000000'
    or (v_order ->> 'expires_at')::timestamptz <> (v_order ->> 'created_at')::timestamptz + interval '1 hour' then
    raise exception 'FAIL: server price, phone normalization, or one-hour expiry';
  end if;
  select stock into v_stock from public.products where id = v_product;
  if v_stock <> 1 then raise exception 'FAIL: stock was not reserved'; end if;
  -- Simulate an old admin form: matching its original version must affect no rows.
  update public.products set stock = 2 where id = v_product and updated_at = v_product_version;
  get diagnostics v_rows = row_count;
  if v_rows <> 0 or (select stock from public.products where id = v_product) <> 1 then
    raise exception 'FAIL: stale admin update overwrote checkout reservation';
  end if;
  v_second := public.create_order(v_payload, v_key, 'customer-test');
  if v_second ->> 'id' <> v_order ->> 'id'
    or (select stock from public.products where id = v_product) <> 1 then
    raise exception 'FAIL: duplicate submission reserved stock again';
  end if;
  update public.store_settings set payment_qr_url = null;
  v_second := public.create_order(v_payload, v_key, 'customer-test');
  if v_second ->> 'id' <> v_order ->> 'id' then
    raise exception 'FAIL: settings change invalidated an existing order retry';
  end if;
  update public.store_settings set payment_qr_url = 'https://example.invalid/test-qr.png';
  update public.products set published = false where id = v_product;
  begin
    perform public.create_order(v_payload, gen_random_uuid(), 'customer-test');
    raise exception 'FAIL: unpublished product was sold';
  exception when raise_exception then
    if sqlerrm <> 'STOCK_UNAVAILABLE' then raise; end if;
  end;
  update public.products set published = true, price = 1500 where id = v_product;
  if (select price from public.order_items where order_id = v_order_id) <> 1234.50 then
    raise exception 'FAIL: product price change modified historical snapshot';
  end if;
  begin
    perform public.create_order(v_payload, v_key, 'different-customer');
    raise exception 'FAIL: guessed idempotency key exposed order';
  exception when raise_exception then
    if sqlerrm <> 'IDEMPOTENCY_CONFLICT' then raise; end if;
  end;
  begin
    perform public.create_order(jsonb_set(v_payload, '{items,0,quantity}', '2'), v_key, 'customer-test');
    raise exception 'FAIL: reused idempotency key accepted changed cart';
  exception when raise_exception then
    if sqlerrm <> 'IDEMPOTENCY_CONFLICT' then raise; end if;
  end;
  begin
    perform public.create_order(jsonb_set(v_payload, '{items,0,quantity}', '2'), gen_random_uuid(), 'customer-test');
    raise exception 'FAIL: insufficient stock was sold';
  exception when raise_exception then
    if sqlerrm <> 'STOCK_UNAVAILABLE' then raise; end if;
  end;
  begin
    perform public.create_order(jsonb_set(v_payload, '{items,0,quantity}', '0'), gen_random_uuid(), 'customer-test');
    raise exception 'FAIL: invalid quantity accepted';
  exception when raise_exception then
    if sqlerrm <> 'INVALID_INPUT' then raise; end if;
  end;
  begin
    perform public.create_order(jsonb_set(v_payload, '{phone}', '"abc0800000000"'), gen_random_uuid(), 'customer-test');
    raise exception 'FAIL: phone containing letters accepted';
  exception when raise_exception then
    if sqlerrm <> 'INVALID_INPUT' then raise; end if;
  end;
  begin
    perform public.transition_order(v_order_id, 'paid', gen_random_uuid());
    raise exception 'FAIL: unauthorized admin transition';
  exception when raise_exception then
    if sqlerrm <> 'FORBIDDEN' then raise; end if;
  end;
  begin
    perform public.transition_order(v_order_id, 'paid', v_admin);
    raise exception 'FAIL: payment confirmed before slip';
  exception when raise_exception then
    if sqlerrm <> 'INVALID_TRANSITION' then raise; end if;
  end;
  begin
    perform public.complete_order(v_order_id);
    raise exception 'FAIL: customer completed unshipped order';
  exception when raise_exception then
    if sqlerrm <> 'INVALID_TRANSITION' then raise; end if;
  end;
  v_slip := v_order_id || '/test-only.png';
  begin
    perform public.attach_slip(v_order_id, v_slip);
    raise exception 'FAIL: nonexistent storage object accepted';
  exception when raise_exception then
    if sqlerrm <> 'INVALID_INPUT' then raise; end if;
  end;
  -- Metadata only, rolled back: no real image is uploaded by this test.
  insert into storage.objects (bucket_id, name) values ('slips', v_slip);
  v_order := public.attach_slip(v_order_id, v_slip);
  if v_order ->> 'status' <> 'slip_submitted' then raise exception 'FAIL: slip transition'; end if;
  perform public.attach_slip(v_order_id, v_slip);
  if (select count(*) from public.order_events where order_id = v_order_id and to_status = 'slip_submitted') <> 1 then
    raise exception 'FAIL: duplicate slip created duplicate event';
  end if;
  -- Submitted slips remain reserved for manual review even after the payment deadline.
  update public.orders set expires_at = now() - interval '1 minute' where id = v_order_id;
  perform public.expire_orders();
  if (select status from public.orders where id = v_order_id) <> 'slip_submitted' then
    raise exception 'FAIL: submitted slip incorrectly expired';
  end if;
  perform public.transition_order(v_order_id, 'paid', v_admin);
  begin
    perform public.transition_order(v_order_id, 'shipped', v_admin, '', '');
    raise exception 'FAIL: missing shipping details accepted';
  exception when raise_exception then
    if sqlerrm <> 'INVALID_INPUT' then raise; end if;
  end;
  perform public.transition_order(v_order_id, 'shipped', v_admin, 'Test carrier', 'TEST123');
  begin
    perform public.transition_order(v_order_id, 'cancelled', v_admin);
    raise exception 'FAIL: shipped order cancelled';
  exception when raise_exception then
    if sqlerrm <> 'INVALID_TRANSITION' then raise; end if;
  end;
  perform public.complete_order(v_order_id);
  perform public.complete_order(v_order_id);
  if (select count(*) from public.order_events where order_id = v_order_id and to_status = 'completed') <> 1 then
    raise exception 'FAIL: duplicate completion';
  end if;

  -- Cancel and repeat: exactly one reservation is released.
  v_second := public.create_order(v_payload, gen_random_uuid(), 'customer-test');
  v_order_id := (v_second ->> 'id')::uuid;
  perform public.transition_order(v_order_id, 'cancelled', v_admin);
  perform public.transition_order(v_order_id, 'cancelled', v_admin);
  if (select stock from public.products where id = v_product) <> 1 then
    raise exception 'FAIL: repeated cancellation returned duplicate stock';
  end if;

  -- The next checkout expires an older reservation and immediately reuses its stock.
  v_second := public.create_order(v_payload, gen_random_uuid(), 'customer-test');
  v_order_id := (v_second ->> 'id')::uuid;
  update public.orders set expires_at = now() - interval '1 minute' where id = v_order_id;
  begin
    perform public.attach_slip(v_order_id, v_order_id || '/expired.png');
    raise exception 'FAIL: expired reservation accepted slip';
  exception when raise_exception then
    if sqlerrm <> 'ORDER_EXPIRED' then raise; end if;
  end;
  v_second := public.create_order(v_payload, gen_random_uuid(), 'customer-test');
  if (select status from public.orders where id = v_order_id) <> 'expired'
    or (select stock from public.products where id = v_product) <> 0 then
    raise exception 'FAIL: checkout expiry stock transaction';
  end if;
  v_order_id := (v_second ->> 'id')::uuid;
  update public.orders set expires_at = now() - interval '1 minute' where id = v_order_id;
  v_count := public.expire_orders();
  perform public.expire_orders();
  if v_count < 1 or (select stock from public.products where id = v_product) <> 1
    or (select count(*) from public.order_events where order_id = v_order_id and to_status = 'expired') <> 1 then
    raise exception 'FAIL: expiry returned duplicate stock or event';
  end if;

  -- An admin can restock while another unit is reserved; returning it must not fail.
  v_second := public.create_order(v_payload, gen_random_uuid(), 'customer-test');
  update public.products set stock = 100000 where id = v_product;
  perform public.transition_order((v_second ->> 'id')::uuid, 'cancelled', v_admin);
  if (select stock from public.products where id = v_product) <> 100001 then
    raise exception 'FAIL: restocking at admin input cap prevented reservation release';
  end if;

  -- Keep volatile counter calls sequential, independent of expression evaluation order.
  v_allowed := public.consume_rate_limit('sql-test-' || v_product, 2, 900);
  if not v_allowed then raise exception 'FAIL: rate counter rejected first request'; end if;
  v_allowed := public.consume_rate_limit('sql-test-' || v_product, 2, 900);
  if not v_allowed then raise exception 'FAIL: rate counter rejected second request'; end if;
  v_allowed := public.consume_rate_limit('sql-test-' || v_product, 2, 900);
  if v_allowed then raise exception 'FAIL: rate counter accepted request beyond limit'; end if;
  update public.rate_limits set expires_at = now() - interval '1 minute' where key = 'sql-test-' || v_product;
  if not public.consume_rate_limit('sql-test-' || v_product, 2, 900) then
    raise exception 'FAIL: rate window did not reset';
  end if;
  raise notice 'MacroCam invariant checks passed; all fixtures will roll back.';
end;
$$;

rollback;
