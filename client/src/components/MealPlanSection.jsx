import { WEEKDAYS } from "../utils/constants";
import {
  addItemsToShoppingList,
  aggregateMealPlanShopping,
  formatWeekdayDate,
  getWeekStart,
} from "../utils/helpers";

export default function MealPlanSection({
  data,
  setData,
  onGoShopping,
}) {
  const recipes = data.recipes;
  const mealPlan = data.mealPlan || { weekStart: null, days: [] };
  const weekStart = mealPlan.weekStart || getWeekStart();

  const setDayRecipe = (dayIndex, recipeId) => {
    const days = [...(mealPlan.days || Array(7).fill(null))];
    while (days.length < 7) days.push(null);
    days[dayIndex] = recipeId || null;
    setData((d) => ({
      ...d,
      mealPlan: { weekStart, days },
    }));
  };

  const shiftWeek = (delta) => {
    const d = new Date(weekStart + "T12:00:00");
    d.setDate(d.getDate() + delta * 7);
    setData((prev) => ({
      ...prev,
      mealPlan: {
        ...prev.mealPlan,
        weekStart: getWeekStart(d),
      },
    }));
  };

  const clearWeek = () => {
    setData((d) => ({
      ...d,
      mealPlan: { weekStart: getWeekStart(), days: Array(7).fill(null) },
    }));
  };

  const generateShoppingList = () => {
    const items = aggregateMealPlanShopping(
      recipes,
      mealPlan,
      data.pantry
    );
    if (!items.length) return;

    setData((d) => ({
      ...d,
      shoppingList: addItemsToShoppingList(
        d.shoppingList,
        items,
        "meal plan"
      ),
    }));
    onGoShopping?.();
  };

  const plannedCount = (mealPlan.days || []).filter(Boolean).length;
  const missingCount = aggregateMealPlanShopping(
    recipes,
    mealPlan,
    data.pantry
  ).length;

  return (
    <section className="rounded-xl border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-card)] p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-serif text-lg font-semibold text-[var(--color-kitchen-amber)]">
            Meal Plan
          </h3>
          <p className="mt-0.5 text-xs text-[var(--color-kitchen-muted)]">
            Week of {formatWeekdayDate(weekStart, 0)}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            className="rounded-lg border border-[var(--color-kitchen-border)] px-2 py-1 text-xs hover:border-[var(--color-kitchen-amber)]"
            aria-label="Previous week"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            className="rounded-lg border border-[var(--color-kitchen-border)] px-2 py-1 text-xs hover:border-[var(--color-kitchen-amber)]"
            aria-label="Next week"
          >
            →
          </button>
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {WEEKDAYS.map((label, i) => {
          const recipeId = mealPlan.days?.[i];
          const recipe = recipes.find((r) => r.id === recipeId);
          return (
            <li
              key={label}
              className="flex items-center gap-2 rounded-lg border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-surface)] p-2"
            >
              <div className="w-14 shrink-0">
                <p className="text-xs font-semibold text-[var(--color-kitchen-amber)]">
                  {label}
                </p>
                <p className="text-[10px] text-[var(--color-kitchen-muted)]">
                  {formatWeekdayDate(weekStart, i)}
                </p>
              </div>
              <select
                value={recipeId || ""}
                onChange={(e) => setDayRecipe(i, e.target.value || null)}
                className="min-w-0 flex-1 rounded-lg border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-card)] px-2 py-1.5 text-sm outline-none"
              >
                <option value="">— None —</option>
                {recipes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              {recipe && (
                <button
                  type="button"
                  onClick={() => setDayRecipe(i, null)}
                  className="shrink-0 text-[var(--color-kitchen-muted)] hover:text-[var(--color-kitchen-danger)]"
                  aria-label="Clear day"
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={generateShoppingList}
          disabled={!plannedCount || !missingCount}
          className="flex-1 rounded-lg bg-[var(--color-kitchen-amber)] py-2.5 text-sm font-semibold text-[#0f0f0f] disabled:opacity-40"
        >
          {missingCount
            ? `Add ${missingCount} items to shopping list`
            : plannedCount
              ? "Pantry has everything!"
              : "Plan meals first"}
        </button>
        {plannedCount > 0 && (
          <button
            type="button"
            onClick={clearWeek}
            className="rounded-lg border border-[var(--color-kitchen-border)] px-3 py-2.5 text-xs text-[var(--color-kitchen-muted)] hover:text-[var(--color-kitchen-cream)]"
          >
            Clear week
          </button>
        )}
      </div>
    </section>
  );
}
