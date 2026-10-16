import assert from "node:assert/strict";

// Read-only pages and rejected requests only; no orders, uploads, or payments are created.
const origin = process.env.SMOKE_ORIGIN || "http://localhost:3000";
let passed = 0;
async function page(path, expected) {
  const response = await fetch(`${origin}${path}`);
  assert.equal(response.status, 200, path);
  const html = await response.text();
  for (const text of expected) assert.ok(html.includes(text), `${path}: ${text}`);
  passed++;
}
async function rejected(path, method, expected, requestOrigin = origin) {
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: { Origin: requestOrigin, "Content-Type": "application/json" },
    ...(method === "GET" ? {} : { body: "{}" }),
  });
  assert.ok(expected.includes(response.status), `${path}: ${response.status}`);
  const body = await response.json();
  assert.equal(typeof body.error, "string");
  assert.equal(body.orders, undefined);
  assert.equal(body.order, undefined);
  assert.equal(response.headers.get("cache-control"), "no-store, private");
  passed++;
}

await page("/", ["MacroCam", 'lang="th"', "อุปกรณ์ที่ใช่", "ร้านตัวอย่าง"]);
await page("/products", ["เลือกซื้ออุปกรณ์ถ่ายภาพ", "ค้นหาภายในรายการสินค้า"]);
await page("/products/canon-r6-ii", ["Canon EOS R6 Mark II", 'property="og:title"', "52,900"]);
await page("/track", ["ติดตามคำสั่งซื้อ", "noindex"]);
await page("/admin", ["หลังร้าน MacroCam", "อ่านอย่างเดียว"]);
await rejected("/api/admin/orders", "GET", [401, 503]);
await rejected("/api/admin/products", "GET", [401, 503]);
await rejected("/api/admin/session", "GET", [401, 503]);
await rejected("/api/cron/expire-orders", "GET", [401, 503]);
await rejected("/api/orders", "POST", [503]);
await rejected("/api/orders", "POST", [403], "https://example.invalid");
await rejected("/api/admin/login", "POST", [403], "https://example.invalid");
console.log(
  `PASS: ${passed} local HTTP checks (demo/missing configuration; no uploads or real transactions).`,
);
