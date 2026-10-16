// Optional isolated PostgreSQL check. The temporary PGlite dependency is external
// to the application; pass its absolute module path as the first CLI argument.
// Auth/Storage are minimal test schemas, not a Supabase service simulation.
const fs = require("node:fs");
const path = require("node:path");
const { PGlite } = require(process.argv[2] || "@electric-sql/pglite");

(async () => {
  const db = await PGlite.create();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role bypassrls;
      create schema auth;
      create table auth.users (id uuid primary key, email text);
      create schema storage;
      create table storage.buckets (
        id text primary key, name text not null, public boolean not null default false,
        file_size_limit bigint, allowed_mime_types text[]
      );
      create table storage.objects (
        id uuid primary key default gen_random_uuid(),
        bucket_id text references storage.buckets(id), name text not null,
        unique(bucket_id,name)
      );
      alter table storage.objects enable row level security;
    `);
    await db.exec(
      fs.readFileSync(path.join(__dirname, "../migrations/202610150001_macrocam.sql"), "utf8"),
    );
    console.log("PASS: migration executes in isolated embedded PostgreSQL");
    await db.exec(fs.readFileSync(path.join(__dirname, "invariants.sql"), "utf8"));
    await db.exec(`
      begin;
      set local role service_role;
      insert into public.products (slug,name,brand,model,category,condition,price,stock,published)
      values ('role-test-only','Role test','Test','Test','cameras','new',100,1,true);
      update public.products set stock = 2 where slug = 'role-test-only';
      update public.store_settings set payment_account = 'TEST ONLY',
        payment_qr_url = 'https://example.invalid/test.png', shipping_policy = 'TEST ONLY',
        return_policy = 'TEST ONLY', privacy_policy = 'TEST ONLY', warranty_policy = 'TEST ONLY'
      where singleton = true;
      select public.create_order(jsonb_build_object(
        'recipient_name','Role test','phone','0800000000','address','TEST ONLY ADDRESS',
        'note','', 'items',jsonb_build_array(jsonb_build_object(
          'product_id',(select id from public.products where slug = 'role-test-only'),'quantity',1
        ))
      ),gen_random_uuid(),'test-only-fingerprint');
      rollback;
    `);
    console.log("PASS: service-role writes, private timestamp triggers and order RPC permissions");
    const result = await db.query("select count(*)::int as remaining_orders from public.orders");
    if (result.rows[0].remaining_orders !== 0)
      throw new Error("Test fixtures were not rolled back");
    console.log("PASS: sequential SQL invariants; all order fixtures rolled back");
    console.log(
      "Scope: local SQL only; real Supabase Auth/Storage and parallel sessions remain untested.",
    );
  } finally {
    await db.close();
  }
})().catch((error) => {
  console.error(error.message, error.detail || "", error.where || "");
  process.exitCode = 1;
});
