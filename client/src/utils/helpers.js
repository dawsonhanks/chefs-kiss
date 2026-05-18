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

export function getWeekStart(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function formatWeekdayDate(weekStartIso, dayIndex) {
  const d = new Date(weekStartIso + "T12:00:00");
  d.setDate(d.getDate() + dayIndex);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function getPriorityPantryItems(pantry) {
  return pantry
    .map((item) => {
      let reason = null;
      let priority = 0;
      if (isExpired(item.expiryDate)) {
        reason = "expired";
        priority = 4;
      } else if (expiresSoon(item.expiryDate)) {
        reason = "expires soon";
        priority = 3;
      } else if (pantryStatus(item) === "out") {
        reason = "out of stock";
        priority = 2;
      } else if (pantryStatus(item) === "low") {
        reason = "running low";
        priority = 1;
      }
      return reason ? { item, reason, priority } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.priority - a.priority);
}

export function getUseItUpRecipes(recipes, pantry, limit = 5) {
  const priority = getPriorityPantryItems(pantry);
  if (!priority.length) return [];

  const scored = recipes
    .map((recipe) => {
      const matched = [];
      for (const { item, reason } of priority) {
        const uses = recipe.ingredients.some((ing) => {
          const m = findPantryMatch([item], ing.name);
          return !!m;
        });
        if (uses) matched.push({ name: item.name, reason });
      }
      if (!matched.length) return null;
      const { canMake } = checkRecipeIngredients(recipe, pantry);
      return {
        recipe,
        matched,
        score: matched.length + (canMake ? 2 : 0),
        canMake,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit);
}

export function addItemsToShoppingList(shoppingList, items, source = null) {
  const existing = new Set(shoppingList.map((s) => normalizeName(s.name)));
  const newItems = [];

  for (const item of items) {
    const key = normalizeName(item.name);
    if (existing.has(key)) continue;
    existing.add(key);
    newItems.push({
      id: uid(),
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      checked: false,
      fromRecipe: source,
    });
  }

  return [...shoppingList, ...newItems];
}

export function aggregateMealPlanShopping(recipes, mealPlan, pantry) {
  const recipeIds = (mealPlan?.days || []).filter(Boolean);
  const seen = new Set();
  const aggregated = [];

  for (const recipeId of recipeIds) {
    const recipe = recipes.find((r) => r.id === recipeId);
    if (!recipe) continue;
    const { missing } = checkRecipeIngredients(recipe, pantry);
    for (const ing of missing) {
      const key = normalizeName(ing.name);
      if (seen.has(key)) continue;
      seen.add(key);
      aggregated.push({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
      });
    }
  }

  return aggregated;
}

export function getRestockItems(pantry) {
  return pantry
    .filter((p) => {
      const s = pantryStatus(p);
      return s === "low" || s === "out";
    })
    .map((p) => ({
      name: p.name,
      quantity: Math.max(1, (p.lowThreshold ?? 1) * 2 - p.quantity),
      unit: p.unit,
    }));
}

export function parseStepTimer(step) {
  const text = step.toLowerCase();
  const minMatch = text.match(/(\d+)\s*(?:–|-)?\s*(\d+)?\s*(?:minutes?|mins?)\b/);
  if (minMatch) {
    const mins = Number(minMatch[2] || minMatch[1]);
    return mins > 0 ? mins * 60 : null;
  }
  const secMatch = text.match(/(\d+)\s*(?:seconds?|secs?)\b/);
  if (secMatch) {
    const secs = Number(secMatch[1]);
    return secs > 0 ? secs : null;
  }
  return null;
}

export function formatTimer(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}
