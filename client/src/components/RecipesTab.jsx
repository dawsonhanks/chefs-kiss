import { useState } from "react";
import { parseRecipeUrl, suggestSubstitutions } from "../api";
import CookMode from "./CookMode";
import MealPlanSection from "./MealPlanSection";
import UseItUpSection from "./UseItUpSection";
import {
  addItemsToShoppingList,
  checkRecipeIngredients,
  uid,
} from "../utils/helpers";

function RecipeCard({
  recipe,
  pantry,
  onAddMissing,
  onLogCooked,
  onCookMode,
  defaultExpanded = false,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsText, setSubsText] = useState(null);
  const [subsError, setSubsError] = useState(null);
  const { results, missing, canMake } = checkRecipeIngredients(recipe, pantry);

  const loadSubstitutions = async () => {
    if (!missing.length) return;
    setSubsLoading(true);
    setSubsError(null);
    setSubsText(null);
    try {
      const text = await suggestSubstitutions(recipe, missing, pantry);
      setSubsText(text);
    } catch (err) {
      setSubsError(err.message);
    } finally {
      setSubsLoading(false);
    }
  };

  return (
    <article className="rounded-xl border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-card)] overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg font-semibold text-[var(--color-kitchen-cream)]">
                {recipe.name}
              </h3>
              {canMake && (
                <span
                  className="text-[var(--color-kitchen-success)]"
                  title="All ingredients in pantry"
                >
                  ✅
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-[var(--color-kitchen-muted)]">
              {recipe.cookTime} · {recipe.servings} servings
            </p>
          </div>
          <span className="text-[var(--color-kitchen-muted)]">
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--color-kitchen-border)] px-4 pb-4 pt-3 space-y-3">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-kitchen-amber)]">
              Ingredients
            </h4>
            <ul className="mt-2 space-y-1 text-sm">
              {results.map((ing, i) => (
                <li
                  key={i}
                  className={
                    ing.status === "available"
                      ? "text-[var(--color-kitchen-success)]"
                      : "text-[var(--color-kitchen-muted)]"
                  }
                >
                  {ing.status === "available" ? "✓" : "○"}{" "}
                  {ing.quantity} {ing.unit} {ing.name}
                  {ing.status === "partial" &&
                    ` (have ${ing.have} ${ing.unit})`}
                  {ing.status === "missing" && " — missing"}
                </li>
              ))}
            </ul>
          </div>

          {!canMake && missing.length > 0 && (
            <p className="text-xs text-[var(--color-kitchen-warning)]">
              Missing: {missing.map((m) => m.name).join(", ")}
            </p>
          )}

          {!canMake && missing.length > 0 && (
            <div className="rounded-lg border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-surface)] p-3">
              <button
                type="button"
                onClick={loadSubstitutions}
                disabled={subsLoading}
                className="text-xs font-medium text-[var(--color-kitchen-amber)] hover:underline disabled:opacity-50"
              >
                {subsLoading
                  ? "Finding substitutions…"
                  : subsText
                    ? "Refresh substitutions"
                    : "Suggest substitutions"}
              </button>
              {subsError && (
                <p className="mt-2 text-xs text-[var(--color-kitchen-danger)]">
                  {subsError}
                </p>
              )}
              {subsText && (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-kitchen-cream)]/90">
                  {subsText}
                </p>
              )}
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-kitchen-amber)]">
              Steps
            </h4>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-[var(--color-kitchen-cream)]/90">
              {recipe.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onCookMode(recipe)}
              className="rounded-lg bg-[var(--color-kitchen-amber)] px-3 py-1.5 text-xs font-semibold text-[#0f0f0f]"
            >
              Cook Mode
            </button>
            {!canMake && (
              <button
                type="button"
                onClick={() => onAddMissing(recipe)}
                className="rounded-lg border border-[var(--color-kitchen-amber)]/50 px-3 py-1.5 text-xs font-medium text-[var(--color-kitchen-amber)] hover:bg-[var(--color-kitchen-amber)]/10"
              >
                Add Missing to Shopping List
              </button>
            )}
            <button
              type="button"
              onClick={() => onLogCooked(recipe)}
              className="rounded-lg border border-[var(--color-kitchen-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-kitchen-muted)] hover:text-[var(--color-kitchen-cream)]"
            >
              Log as Cooked
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export default function RecipesTab({ data, setData, onTabChange }) {
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState(null);
  const [parsedRecipe, setParsedRecipe] = useState(null);
  const [cookRecipe, setCookRecipe] = useState(null);
  const [highlightRecipeId, setHighlightRecipeId] = useState(null);

  const addMissingToShopping = (recipe) => {
    const { missing } = checkRecipeIngredients(recipe, data.pantry);
    if (!missing.length) return;

    setData((d) => ({
      ...d,
      shoppingList: addItemsToShoppingList(
        d.shoppingList,
        missing,
        recipe.name
      ),
    }));
    onTabChange?.("shopping");
  };

  const logCooked = (recipe) => {
    setData((d) => ({
      ...d,
      cookHistory: [
        {
          id: uid(),
          recipeId: recipe.id,
          recipeName: recipe.name,
          date: new Date().toISOString(),
          rating: null,
          notes: "",
        },
        ...d.cookHistory,
      ],
    }));
    onTabChange?.("history");
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportError(null);
    setParsedRecipe(null);
    try {
      const recipe = await parseRecipeUrl(importUrl.trim());
      setParsedRecipe({ ...recipe, id: uid(), source: "imported" });
    } catch (err) {
      setImportError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const saveImported = () => {
    if (!parsedRecipe) return;
    setData((d) => ({
      ...d,
      recipes: [...d.recipes, parsedRecipe],
    }));
    setParsedRecipe(null);
    setImportUrl("");
  };

  const importCheck = parsedRecipe
    ? checkRecipeIngredients(parsedRecipe, data.pantry)
    : null;

  return (
    <div className="space-y-4">
      <MealPlanSection
        data={data}
        setData={setData}
        onGoShopping={() => onTabChange?.("shopping")}
      />

      <UseItUpSection
        data={data}
        onSelectRecipe={(id) => setHighlightRecipeId(id)}
      />

      <section className="rounded-xl border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-card)] p-4">
        <h3 className="font-serif text-lg font-semibold text-[var(--color-kitchen-amber)]">
          Import Recipe from URL
        </h3>
        <form onSubmit={handleImport} className="mt-3 flex gap-2">
          <input
            type="url"
            placeholder="https://example.com/recipe"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-kitchen-amber)]"
          />
          <button
            type="submit"
            disabled={importing}
            className="shrink-0 rounded-lg bg-[var(--color-kitchen-amber)] px-4 py-2 text-sm font-semibold text-[#0f0f0f] disabled:opacity-50"
          >
            {importing ? "…" : "Parse"}
          </button>
        </form>
        {importError && (
          <p className="mt-2 text-xs text-[var(--color-kitchen-danger)]">
            {importError}
          </p>
        )}

        {parsedRecipe && importCheck && (
          <div className="mt-4 space-y-3 border-t border-[var(--color-kitchen-border)] pt-4">
            <h4 className="font-serif font-semibold">{parsedRecipe.name}</h4>
            <p className="text-xs text-[var(--color-kitchen-muted)]">
              {parsedRecipe.cookTime} · {parsedRecipe.servings} servings
            </p>
            <ul className="text-sm space-y-1">
              {importCheck.results.map((ing, i) => (
                <li
                  key={i}
                  className={
                    ing.status === "available"
                      ? "text-[var(--color-kitchen-success)]"
                      : "text-[var(--color-kitchen-muted)]"
                  }
                >
                  {ing.status === "available" ? "✓ In pantry" : "○ Missing"}:{" "}
                  {ing.quantity} {ing.unit} {ing.name}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2">
              {importCheck.missing.length > 0 && (
                <button
                  type="button"
                  onClick={() => addMissingToShopping(parsedRecipe)}
                  className="rounded-lg border border-[var(--color-kitchen-amber)]/50 px-3 py-1.5 text-xs font-medium text-[var(--color-kitchen-amber)]"
                >
                  Add Missing to Shopping List
                </button>
              )}
              <button
                type="button"
                onClick={saveImported}
                className="rounded-lg bg-[var(--color-kitchen-amber)] px-3 py-1.5 text-xs font-semibold text-[#0f0f0f]"
              >
                Save Recipe
              </button>
            </div>
          </div>
        )}
      </section>

      <div className="space-y-3">
        {data.recipes.map((recipe) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            pantry={data.pantry}
            onAddMissing={addMissingToShopping}
            onLogCooked={logCooked}
            onCookMode={setCookRecipe}
            defaultExpanded={recipe.id === highlightRecipeId}
          />
        ))}
      </div>

      {cookRecipe && (
        <CookMode
          recipe={cookRecipe}
          onClose={() => setCookRecipe(null)}
          onLogCooked={(r) => {
            logCooked(r);
            setCookRecipe(null);
          }}
        />
      )}
    </div>
  );
}
