import { UNITS } from "./constants";

const CATEGORY_RULES = [
  { match: /dair|milk|cheese|yogurt|butter|cream/i, category: "Dairy" },
  { match: /meat|poultry|fish|seafood|beef|pork|chicken|sausage/i, category: "Meat" },
  { match: /fruit|vegetable|produce|herb|salad|greens/i, category: "Produce" },
  { match: /grain|cereal|pasta|rice|bread|flour|oat/i, category: "Grains" },
  { match: /spice|seasoning|herb-spice|pepper|salt|cinnamon/i, category: "Spices" },
  { match: /canned|preserve|jar/i, category: "Canned" },
  { match: /frozen|ice-cream/i, category: "Frozen" },
];

function mapCategory(tags = [], categories = "") {
  const haystack = [...tags, categories].join(" ").toLowerCase();
  for (const { match, category } of CATEGORY_RULES) {
    if (match.test(haystack)) return category;
  }
  return "Other";
}

function parsePackageQuantity(quantityStr) {
  if (!quantityStr) return { quantity: 1, unit: "whole" };

  const match = String(quantityStr).match(/^([\d.]+)\s*([a-zA-Z]+)/);
  if (!match) return { quantity: 1, unit: "whole" };

  const qty = parseFloat(match[1]);
  if (!Number.isFinite(qty) || qty <= 0) return { quantity: 1, unit: "whole" };

  const raw = match[2].toLowerCase();
  const aliases = {
    g: "g",
    gram: "g",
    grams: "g",
    kg: "kg",
    kilogram: "kg",
    kilograms: "kg",
    ml: "ml",
    milliliter: "ml",
    milliliters: "ml",
    l: "L",
    liter: "L",
    liters: "L",
    litre: "L",
    litres: "L",
    oz: "oz",
    ounce: "oz",
    ounces: "oz",
    cup: "cups",
    cups: "cups",
    tbsp: "tbsp",
    tablespoon: "tbsp",
    tablespoons: "tbsp",
    tsp: "tsp",
    teaspoon: "tsp",
    teaspoons: "tsp",
  };

  const unit = aliases[raw];
  if (unit && UNITS.includes(unit)) return { quantity: qty, unit };
  return { quantity: 1, unit: "whole" };
}

function productDisplayName(product) {
  const name =
    product.product_name?.trim() ||
    product.product_name_en?.trim() ||
    product.generic_name?.trim() ||
    product.abbreviated_product_name?.trim();
  if (name) return name;
  if (product.brands?.trim()) return product.brands.trim();
  return null;
}

export async function lookupBarcode(barcode) {
  const code = String(barcode).replace(/\D/g, "");
  if (!code) {
    throw new Error("Invalid barcode");
  }

  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_en,generic_name,abbreviated_product_name,brands,quantity,categories,categories_tags,image_front_small_url`
  );

  if (!res.ok) {
    throw new Error("Could not reach product database");
  }

  const data = await res.json();
  if (data.status !== 1 || !data.product) {
    return null;
  }

  const p = data.product;
  const name = productDisplayName(p);
  if (!name) return null;

  const { quantity, unit } = parsePackageQuantity(p.quantity);

  return {
    barcode: code,
    name,
    brand: p.brands?.trim() || null,
    category: mapCategory(p.categories_tags, p.categories),
    quantity,
    unit,
    imageUrl: p.image_front_small_url || null,
  };
}
