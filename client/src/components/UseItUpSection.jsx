import { getUseItUpRecipes } from "../utils/helpers";

export default function UseItUpSection({ data, onSelectRecipe }) {
  const suggestions = getUseItUpRecipes(data.recipes, data.pantry);

  if (!suggestions.length) return null;

  return (
    <section className="rounded-xl border border-[var(--color-kitchen-warning)]/30 bg-[var(--color-kitchen-warning)]/5 p-4">
      <h3 className="font-serif text-lg font-semibold text-[var(--color-kitchen-warning)]">
        Use It Up
      </h3>
      <p className="mt-0.5 text-xs text-[var(--color-kitchen-muted)]">
        Recipes that use items expiring soon or running low
      </p>
      <ul className="mt-3 space-y-2">
        {suggestions.map(({ recipe, matched, canMake }) => (
          <li
            key={recipe.id}
            className="rounded-lg border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-card)] p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-[var(--color-kitchen-cream)]">
                  {recipe.name}
                  {canMake && (
                    <span className="ml-2 text-[var(--color-kitchen-success)]">
                      ✓
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-[var(--color-kitchen-muted)]">
                  Uses{" "}
                  {matched
                    .map((m) => `${m.name} (${m.reason})`)
                    .join(", ")}
                </p>
              </div>
              {onSelectRecipe && (
                <button
                  type="button"
                  onClick={() => onSelectRecipe(recipe.id)}
                  className="shrink-0 text-xs font-medium text-[var(--color-kitchen-amber)] hover:underline"
                >
                  View
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
