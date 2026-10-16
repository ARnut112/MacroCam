import test from "node:test";
import assert from "node:assert/strict";
import {
  canTransition,
  normalizePhone,
  orderInput,
  orderIdentity,
  productInput,
  signAccessToken,
  verifyAccessToken,
  validateImage,
  MAX_IMAGE_BYTES,
  confirmedDatabaseRejection,
} from "../lib/server/validation";

const productId = "550e8400-e29b-41d4-a716-446655440000";
const valid = {
  idempotencyKey: "1d91b169-97c1-4db8-bbba-51c81c552c74",
  items: [{ productId, quantity: 1 }],
  recipient: "ผู้รับทดสอบ",
  phone: "081-234-5678",
  address: "ที่อยู่จำลองสำหรับทดสอบ",
};

test("checkout ignores client prices and normalizes telephone", () => {
  const input = orderInput({
    ...valid,
    price: 1,
    total: 1,
    items: [{ productId, quantity: 1, price: 1 }],
  });
  assert.equal(input.payload.phone, "0812345678");
  assert.deepEqual(input.payload.items, [{ product_id: productId, quantity: 1 }]);
  assert.equal("total" in input.payload, false);
  assert.equal(normalizePhone("+66 81 234 5678"), "0812345678");
  assert.equal(normalizePhone("02 123 4567"), "021234567");
  for (const phone of ["123456789", "081234567890", "+1 212 555 1234", "08abc12345678"])
    assert.throws(() => normalizePhone(phone));
});

test("checkout rejects duplicate products, invalid quantity, missing identity, and control characters", () => {
  assert.throws(() =>
    orderInput({
      ...valid,
      items: [
        { productId, quantity: 1 },
        { productId: productId.toUpperCase(), quantity: 1 },
      ],
    }),
  );
  for (const quantity of [0, -1, 1.5, 100, "1", NaN, Infinity])
    assert.throws(() => orderInput({ ...valid, items: [{ productId, quantity }] }));
  assert.throws(() => orderInput({ ...valid, idempotencyKey: "predictable" }));
  assert.throws(() => orderInput({ ...valid, recipient: "customer\u0000" }));
  assert.throws(() => orderIdentity({ orderNumber: "MC-ABCDEFGH" }));
  assert.throws(() => orderIdentity({ phone: valid.phone }));
});

test("only submitted slips can be approved; shipping and completion obey actor rules", () => {
  assert.equal(canTransition("awaiting_payment", "paid", "admin"), false);
  assert.equal(canTransition("slip_submitted", "paid", "admin"), true);
  assert.equal(canTransition("paid", "shipped", "admin"), true);
  assert.equal(canTransition("paid", "completed", "customer"), false);
  assert.equal(canTransition("shipped", "completed", "customer"), true);
  assert.equal(canTransition("shipped", "cancelled", "admin"), false);
  assert.equal(canTransition("slip_submitted", "expired", "expiry"), false);
  assert.equal(canTransition("awaiting_payment", "expired", "expiry"), true);
  assert.equal(canTransition("cancelled", "cancelled", "admin"), true);
  assert.equal(canTransition("completed", "paid", "admin"), false);
  assert.equal(canTransition("awaiting_payment", "awaiting_payment", "admin"), false);
  assert.equal(canTransition("paid", "paid", "customer"), false);
});

test("cleanup preserves uploaded files when a network error may hide a committed transaction", () => {
  assert.equal(confirmedDatabaseRejection({ code: "P0001" }), true);
  assert.equal(confirmedDatabaseRejection({ code: "23514" }), true);
  assert.equal(confirmedDatabaseRejection({}), false);
  assert.equal(confirmedDatabaseRejection({ code: "ETIMEDOUT" }), false);
  assert.equal(confirmedDatabaseRejection({ code: "PGRST301" }), false);
  assert.equal(confirmedDatabaseRejection({ code: "08007" }), false);
  assert.equal(confirmedDatabaseRejection({ code: "40003" }), false);
  assert.equal(confirmedDatabaseRejection({ code: "40001" }), true);
  assert.equal(confirmedDatabaseRejection({ code: "40P01" }), true);
});

test("slips enforce size, MIME and matching image signature", () => {
  assert.equal(MAX_IMAGE_BYTES, 4194304);
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const webp = new TextEncoder().encode("RIFFabcdWEBP");
  assert.equal(validateImage(jpg, "image/jpeg"), "jpg");
  assert.equal(validateImage(png, "image/png"), "png");
  assert.equal(validateImage(webp, "image/webp"), "webp");
  assert.throws(() => validateImage(jpg, "image/png"));
  assert.throws(() =>
    validateImage(new TextEncoder().encode("<script>alert(1)</script>"), "image/jpeg"),
  );
  assert.throws(() => validateImage(png, "image/svg+xml"));
  assert.throws(() => validateImage(new Uint8Array(), "image/png"));
  assert.throws(() => validateImage(new Uint8Array(MAX_IMAGE_BYTES + 1), "image/jpeg"));
  const exactlyAtLimit = new Uint8Array(MAX_IMAGE_BYTES);
  exactlyAtLimit.set(jpg);
  assert.equal(validateImage(exactlyAtLimit, "image/jpeg"), "jpg");
  const oldFiveMiBLimit = new Uint8Array(5 * 1024 * 1024);
  oldFiveMiBLimit.set(jpg);
  assert.throws(() => validateImage(oldFiveMiBLimit, "image/jpeg"));
});

test("order tokens are signed, expiring and tamper resistant", () => {
  const secret = "test-only-secret-at-least-32-characters";
  const token = signAccessToken(productId, "MC-ABCDEFGH", secret, 1000000);
  assert.deepEqual(verifyAccessToken(token, secret, 1000000), {
    id: productId,
    number: "MC-ABCDEFGH",
  });
  assert.equal(verifyAccessToken(token, "different-secret", 1000000), null);
  assert.equal(verifyAccessToken(`${token}x`, secret, 1000000), null);
  assert.equal(verifyAccessToken(token, secret, 1000000 + 7 * 24 * 60 * 60 * 1000), null);
  assert.equal(verifyAccessToken("malformed", secret), null);
});

test("admin input cannot write protected columns or accept unsafe image URLs", () => {
  const patch = productInput(
    { published: false, id: "replacement", created_at: "yesterday", stock: 2 },
    true,
  );
  assert.deepEqual(patch, { stock: 2, published: false });
  assert.throws(() => productInput({ stock: -1 }, true));
  assert.throws(() => productInput({ images: ["javascript:alert(1)"] }, true));
  assert.throws(() =>
    productInput({ images: ["https://user:password@example.com/image.jpg"] }, true),
  );
  assert.throws(() => productInput({ price: 1.001 }, true));
  assert.deepEqual(productInput({ originalPrice: null }, true), { original_price: null });
  assert.equal(
    productInput({ images: ["https://example.com/camera.jpg"] }, true).images instanceof Array,
    true,
  );
});
