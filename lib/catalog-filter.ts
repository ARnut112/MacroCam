import type { Product } from "./types";

export function filterProducts(products: Product[], params: URLSearchParams) {
  const query = (params.get("q") || "").toLowerCase().trim();
  const category = params.get("category");
  const brand = params.get("brand");
  const condition = params.get("condition");
  const mount = params.get("mount");
  const inStock = params.get("stock") === "available";
  const filtered = products.filter(
    (p) =>
      p.published &&
      (!query ||
        `${p.name} ${p.brand} ${p.model} ${p.tagline} ${p.mount || ""}`
          .toLowerCase()
          .includes(query)) &&
      (!category || p.category === category) &&
      (!brand || p.brand === brand) &&
      (!condition || p.condition === condition) &&
      (!mount || p.mount === mount) &&
      (!inStock || p.stock > 0),
  );
  switch (params.get("sort")) {
    case "price-asc":
      return filtered.sort((a, b) => a.price - b.price);
    case "price-desc":
      return filtered.sort((a, b) => b.price - a.price);
    case "name":
      return filtered.sort((a, b) => a.name.localeCompare(b.name, "th"));
    default:
      return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}
