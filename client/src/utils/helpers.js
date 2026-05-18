export function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeName(name) {
  return (name || "").toLowerCase().trim().replace(/\s+/g, " ");
}

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function monthKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key) {
  const [y, m] = key.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function isExpired(expiryDate) {
  if (!expiryDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  return exp < today;
}

export function expiresSoon(expiryDate, days = 7) {
  if (!expiryDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  const diff = (exp - today) / (1000 * 60 * 60 * 24);
  return diff >= 0 && diff <= days;
}

export function pantryStatus(item) {
  if (item.quantity <= 0) return "out";
  const threshold = item.lowThreshold ?? 1;
  if (item.quantity <= threshold) return "low";
  return "ok";
}

export function findPantryMatch(pantry, ingredientName) {
  const target = normalizeName(ingredientName);
  return pantry.find((p) => {
    const pn = normalizeName(p.name);
    return pn === target || pn.includes(target) || target.includes(pn);
  });
}

export function checkRecipeIngredients(recipe, pantry) {
  const results = recipe.ingredients.map((ing) => {
    const match = findPantryMatch(pantry, ing.name);
    if (!match || match.quantity <= 0) {
      return { ...ing, status: "missing", available: 0 };
    }
    const sameUnit = match.unit === ing.unit;
    const enough =
      sameUnit && match.quantity >= ing.quantity
        ? true
        : !sameUnit && match.quantity > 0;
    if (enough && sameUnit) {
      return { ...ing, status: "available", pantryItem: match };
    }
    if (match.quantity > 0) {
      return {
        ...ing,
        status: "partial",
        pantryItem: match,
        have: match.quantity,
        unit: match.unit,
      };
    }
    return { ...ing, status: "missing", pantryItem: match };
  });

  const missing = results.filter((r) => r.status !== "available");
  const canMake = missing.length === 0;

  return { results, missing, canMake };
}

export function countMakeableRecipes(recipes, pantry) {
  return recipes.filter((r) => checkRecipeIngredients(r, pantry).canMake).length;
}

export function historyStats(history) {
  if (!history.length) {
    return { total: 0, avgRating: 0, topRecipe: "—" };
  }
  const total = history.length;
  const rated = history.filter((h) => h.rating);
  const avgRating = rated.length
    ? rated.reduce((s, h) => s + h.rating, 0) / rated.length
    : 0;
  const counts = {};
  for (const h of history) {
    counts[h.recipeName] = (counts[h.recipeName] || 0) + 1;
  }
  const topRecipe =
    Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  return { total, avgRating, topRecipe };
}

export function ratingEmoji(value) {
  const map = { 1: "😐", 2: "🙂", 3: "😋", 4: "🤩" };
  return map[value] || "—";
}
