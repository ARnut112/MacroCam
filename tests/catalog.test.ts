import test from "node:test";
import assert from "node:assert/strict";
import { products } from "../lib/catalog";
import { filterProducts } from "../lib/catalog-filter";
import type { Product } from "../lib/types";

function item(id: string, values: Partial<Product>): Product {
  return {
    ...products[0],
    id,
    slug: id,
    name: id,
    brand: "Example",
    model: "Model",
    tagline: "",
    mount: undefined,
    price: 100,
    stock: 1,
    createdAt: "2026-10-10T00:00:00.000Z",
    ...values,
  };
}

// Deliberately mix dates, prices, availability and visibility so one selector cannot
// accidentally satisfy the expectations of another selector.
const catalog = [
  item("sony-body", {
    name: "Alpha camera",
    brand: "Sony",
    model: "A7 IV",
    category: "cameras",
    condition: "used",
    mount: "Sony E",
    price: 45000,
    stock: 1,
    createdAt: "2026-10-12T00:00:00.000Z",
  }),
  item("sony-lens", {
    name: "Bravo lens",
    brand: "Sony",
    model: "FE 35",
    category: "lenses",
    condition: "new",
    mount: "Sony E",
    price: 19000,
    stock: 2,
    createdAt: "2026-10-11T00:00:00.000Z",
  }),
  item("canon-body", {
    name: "Charlie camera",
    brand: "Canon",
    model: "EOS R8",
    category: "cameras",
    condition: "used",
    mount: "Canon RF",
    price: 32000,
    stock: 0,
    createdAt: "2026-10-15T00:00:00.000Z",
  }),
  item("fuji-body", {
    name: "Delta camera",
    brand: "Fujifilm",
    model: "X-T5",
    category: "cameras",
    condition: "new",
    mount: "Fujifilm X",
    price: 55000,
    stock: 2,
    tagline: "เก็บเรื่องราวระหว่างทาง",
    createdAt: "2026-10-13T00:00:00.000Z",
  }),
  item("hidden-body", {
    name: "Hidden special",
    brand: "Sony",
    model: "Secret prototype",
    category: "cameras",
    condition: "used",
    mount: "Sony E",
    price: 1,
    stock: 99,
    published: false,
    createdAt: "2026-10-16T00:00:00.000Z",
  }),
];

const ids = (params: Record<string, string> = {}) =>
  filterProducts(catalog, new URLSearchParams(params)).map((product) => product.id);

test("default catalog hides unpublished products, keeps sold-out products, and lists newest first", () => {
  assert.deepEqual(ids(), ["canon-body", "fuji-body", "sony-body", "sony-lens"]);
});

test("search finds a name, brand, or model regardless of case and surrounding spaces", () => {
  assert.deepEqual(ids({ q: "  ALPHA CAMERA  " }), ["sony-body"]);
  assert.deepEqual(ids({ q: "  sOnY  " }), ["sony-body", "sony-lens"]);
  assert.deepEqual(ids({ q: "  eOs R8 " }), ["canon-body"]);
  assert.deepEqual(ids({ q: "A7 IV" }), ["sony-body"]);
});

test("search supports Thai descriptions and mount names", () => {
  assert.deepEqual(ids({ q: "เรื่องราวระหว่างทาง" }), ["fuji-body"]);
  assert.deepEqual(ids({ q: "canon rf" }), ["canon-body"]);
});

test("blank search behaves like no search and unmatched search is empty", () => {
  assert.deepEqual(ids({ q: "   " }), ids());
  assert.deepEqual(ids({ q: "this item is not in the catalog" }), []);
});

test("category selects only the requested equipment type", () => {
  assert.deepEqual(ids({ category: "lenses" }), ["sony-lens"]);
  assert.deepEqual(ids({ category: "lighting" }), []);
});

test("brand selection is exact and unpublished products stay hidden", () => {
  assert.deepEqual(ids({ brand: "Sony" }), ["sony-body", "sony-lens"]);
  assert.deepEqual(ids({ brand: "Son" }), []);
  assert.deepEqual(ids({ q: "Secret prototype" }), []);
});

test("condition selection separates new and used equipment", () => {
  assert.deepEqual(ids({ condition: "new" }), ["fuji-body", "sony-lens"]);
  assert.deepEqual(ids({ condition: "used" }), ["canon-body", "sony-body"]);
});

test("mount selection does not mix incompatible camera systems", () => {
  assert.deepEqual(ids({ mount: "Sony E" }), ["sony-body", "sony-lens"]);
  assert.deepEqual(ids({ mount: "Canon RF" }), ["canon-body"]);
  assert.deepEqual(ids({ mount: "Nikon Z" }), []);
});

test("available-stock filter removes zero-stock products without hiding them by default", () => {
  assert.deepEqual(ids({ stock: "available" }), ["fuji-body", "sony-body", "sony-lens"]);
  assert.deepEqual(ids({ category: "cameras", brand: "Canon", stock: "available" }), []);
  assert.deepEqual(ids({ category: "cameras", brand: "Canon" }), ["canon-body"]);
});

test("search and all selections compose as an intersection", () => {
  assert.deepEqual(
    ids({
      q: "A7",
      category: "cameras",
      brand: "Sony",
      condition: "used",
      mount: "Sony E",
      stock: "available",
    }),
    ["sony-body"],
  );
  assert.deepEqual(
    ids({
      q: "A7",
      category: "cameras",
      brand: "Sony",
      condition: "new",
      mount: "Sony E",
      stock: "available",
    }),
    [],
  );
});

test("price and name sorting order only the visible matching results", () => {
  assert.deepEqual(ids({ sort: "price-asc" }), [
    "sony-lens",
    "canon-body",
    "sony-body",
    "fuji-body",
  ]);
  assert.deepEqual(ids({ sort: "price-desc" }), [
    "fuji-body",
    "sony-body",
    "canon-body",
    "sony-lens",
  ]);
  assert.deepEqual(ids({ sort: "name" }), ["sony-body", "sony-lens", "canon-body", "fuji-body"]);
  assert.deepEqual(ids({ brand: "Sony", sort: "price-asc" }), ["sony-lens", "sony-body"]);
});

test("filtering and sorting leave the source catalog unchanged", () => {
  const before = structuredClone(catalog);
  filterProducts(catalog, new URLSearchParams({ sort: "price-asc", stock: "available" }));
  assert.deepEqual(catalog, before);
});
