import { useState } from "react";
import { UNITS } from "../utils/constants";
import { normalizeName, uid } from "../utils/helpers";

export default function ShoppingTab({ data, setData }) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("whole");

  const unchecked = data.shoppingList.filter((s) => !s.checked);
  const checked = data.shoppingList.filter((s) => s.checked);

  const addManual = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setData((d) => ({
      ...d,
      shoppingList: [
        ...d.shoppingList,
        {
          id: uid(),
          name: name.trim(),
          quantity: Number(quantity) || 1,
          unit,
          checked: false,
          fromRecipe: null,
        },
      ],
    }));
    setName("");
    setQuantity(1);
  };

  const toggle = (id) => {
    setData((d) => ({
      ...d,
      shoppingList: d.shoppingList.map((s) =>
        s.id === id ? { ...s, checked: !s.checked } : s
      ),
    }));
  };

  const remove = (id) => {
    setData((d) => ({
      ...d,
      shoppingList: d.shoppingList.filter((s) => s.id !== id),
    }));
  };

  const moveCheckedToPantry = () => {
    const toMove = data.shoppingList.filter((s) => s.checked);
    if (!toMove.length) return;

    setData((d) => {
      const pantry = [...d.pantry];
      for (const item of toMove) {
        const key = normalizeName(item.name);
        const existing = pantry.find((p) => normalizeName(p.name) === key);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          pantry.push({
            id: uid(),
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            category: "Other",
            expiryDate: null,
            lowThreshold: 1,
          });
        }
      }
      return {
        ...d,
        pantry,
        shoppingList: d.shoppingList.filter((s) => !s.checked),
      };
    });
  };

  const walmartUrl = () => {
    const q = unchecked.map((s) => s.name).join(" ");
    return `https://www.walmart.com/search?q=${encodeURIComponent(q || "groceries")}`;
  };

  const ItemRow = ({ item }) => (
    <li className="flex items-center gap-3 rounded-xl border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-card)] px-3 py-2.5">
      <input
        type="checkbox"
        checked={item.checked}
        onChange={() => toggle(item.id)}
        className="h-4 w-4 accent-[var(--color-kitchen-amber)]"
      />
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm font-medium capitalize ${
            item.checked
              ? "text-[var(--color-kitchen-muted)] line-through"
              : ""
          }`}
        >
          {item.name}
        </p>
        <p className="text-xs text-[var(--color-kitchen-muted)]">
          {item.quantity} {item.unit}
          {item.fromRecipe && ` · from ${item.fromRecipe}`}
        </p>
      </div>
      <button
        type="button"
        onClick={() => remove(item.id)}
        className="text-[var(--color-kitchen-muted)] hover:text-[var(--color-kitchen-danger)]"
        aria-label="Remove"
      >
        ×
      </button>
    </li>
  );

  return (
    <div className="space-y-4">
      <form
        onSubmit={addManual}
        className="flex flex-wrap gap-2 rounded-xl border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-card)] p-3"
      >
        <input
          placeholder="Add item"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-w-[120px] flex-1 rounded-lg border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-surface)] px-3 py-2 text-sm outline-none"
        />
        <input
          type="number"
          min="0"
          step="any"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-16 rounded-lg border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-surface)] px-2 py-2 text-sm"
        />
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          className="rounded-lg border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-surface)] px-2 py-2 text-sm"
        >
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-[var(--color-kitchen-amber)] px-4 py-2 text-sm font-semibold text-[#0f0f0f]"
        >
          Add
        </button>
      </form>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={moveCheckedToPantry}
          disabled={checked.length === 0}
          className="flex-1 rounded-lg border border-[var(--color-kitchen-amber)]/50 py-2.5 text-sm font-medium text-[var(--color-kitchen-amber)] disabled:opacity-40"
        >
          Move Checked to Pantry
        </button>
        <a
          href={walmartUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-[#0071dc] px-4 py-2.5 text-sm font-semibold text-white"
        >
          Walmart ↗
        </a>
      </div>

      {unchecked.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-kitchen-muted)]">
            To Buy ({unchecked.length})
          </h3>
          <ul className="space-y-2">
            {unchecked.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </ul>
        </section>
      )}

      {checked.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-kitchen-muted)]">
            Checked ({checked.length})
          </h3>
          <ul className="space-y-2">
            {checked.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </ul>
        </section>
      )}

      {data.shoppingList.length === 0 && (
        <p className="py-8 text-center text-sm text-[var(--color-kitchen-muted)]">
          Shopping list is empty. Add missing ingredients from recipes.
        </p>
      )}
    </div>
  );
}
