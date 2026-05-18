import { useState } from "react";
import StatCard from "./StatCard";
import { CATEGORIES, UNITS } from "../utils/constants";
import {
  countMakeableRecipes,
  expiresSoon,
  isExpired,
  pantryStatus,
  uid,
} from "../utils/helpers";

export default function PantryTab({ data, setData }) {
  const [form, setForm] = useState({
    name: "",
    quantity: 1,
    unit: "whole",
    category: "Other",
    expiryDate: "",
  });
  const [showForm, setShowForm] = useState(false);

  const pantry = data.pantry;
  const lowCount = pantry.filter((p) => pantryStatus(p) === "low").length;
  const outCount = pantry.filter((p) => pantryStatus(p) === "out").length;
  const makeable = countMakeableRecipes(data.recipes, pantry);

  const addItem = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setData((d) => ({
      ...d,
      pantry: [
        ...d.pantry,
        {
          id: uid(),
          name: form.name.trim(),
          quantity: Number(form.quantity) || 0,
          unit: form.unit,
          category: form.category,
          expiryDate: form.expiryDate || null,
          lowThreshold: 1,
        },
      ],
    }));
    setForm({
      name: "",
      quantity: 1,
      unit: "whole",
      category: "Other",
      expiryDate: "",
    });
    setShowForm(false);
  };

  const adjustQty = (id, delta) => {
    setData((d) => ({
      ...d,
      pantry: d.pantry.map((p) =>
        p.id === id
          ? { ...p, quantity: Math.max(0, p.quantity + delta) }
          : p
      ),
    }));
  };

  const removeItem = (id) => {
    setData((d) => ({
      ...d,
      pantry: d.pantry.filter((p) => p.id !== id),
    }));
  };

  const sorted = [...pantry].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <StatCard label="Total Items" value={pantry.length} />
        <StatCard label="Running Low" value={lowCount} accent={lowCount > 0} />
        <StatCard label="Out of Stock" value={outCount} accent={outCount > 0} />
        <StatCard label="Recipes I Can Make" value={makeable} accent />
      </div>

      <button
        type="button"
        onClick={() => setShowForm(!showForm)}
        className="w-full rounded-xl border border-dashed border-[var(--color-kitchen-amber)]/40 py-2.5 text-sm font-medium text-[var(--color-kitchen-amber)] transition hover:bg-[var(--color-kitchen-amber)]/10"
      >
        {showForm ? "Cancel" : "+ Add Ingredient"}
      </button>

      {showForm && (
        <form
          onSubmit={addItem}
          className="space-y-3 rounded-xl border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-card)] p-4"
        >
          <input
            required
            placeholder="Ingredient name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-kitchen-amber)]"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min="0"
              step="any"
              value={form.quantity}
              onChange={(e) =>
                setForm({ ...form, quantity: e.target.value })
              }
              className="rounded-lg border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-kitchen-amber)]"
            />
            <select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="rounded-lg border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-surface)] px-3 py-2 text-sm outline-none"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full rounded-lg border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-surface)] px-3 py-2 text-sm outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={form.expiryDate}
            onChange={(e) =>
              setForm({ ...form, expiryDate: e.target.value })
            }
            className="w-full rounded-lg border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-surface)] px-3 py-2 text-sm outline-none"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-[var(--color-kitchen-amber)] py-2.5 text-sm font-semibold text-[#0f0f0f]"
          >
            Add to Pantry
          </button>
        </form>
      )}

      <ul className="space-y-2">
        {sorted.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--color-kitchen-muted)]">
            Your pantry is empty. Add ingredients to get started.
          </p>
        )}
        {sorted.map((item) => {
          const status = pantryStatus(item);
          const expired = isExpired(item.expiryDate);
          const soon = expiresSoon(item.expiryDate);

          return (
            <li
              key={item.id}
              className="rounded-xl border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-card)] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium capitalize">{item.name}</h3>
                    {status === "out" && (
                      <span className="rounded-full bg-[var(--color-kitchen-danger)]/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--color-kitchen-danger)]">
                        Out of Stock
                      </span>
                    )}
                    {status === "low" && (
                      <span className="rounded-full bg-[var(--color-kitchen-warning)]/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--color-kitchen-warning)]">
                        Running Low
                      </span>
                    )}
                    {expired && (
                      <span className="rounded-full bg-[var(--color-kitchen-danger)]/20 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-kitchen-danger)]">
                        Expired
                      </span>
                    )}
                    {!expired && soon && (
                      <span className="rounded-full bg-[var(--color-kitchen-warning)]/20 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-kitchen-warning)]">
                        Expires Soon
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--color-kitchen-muted)]">
                    {item.category}
                    {item.expiryDate && ` · Exp ${item.expiryDate}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="text-[var(--color-kitchen-muted)] hover:text-[var(--color-kitchen-danger)]"
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjustQty(item.id, -1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-kitchen-border)] text-lg hover:border-[var(--color-kitchen-amber)]"
                  >
                    −
                  </button>
                  <span className="min-w-[4rem] text-center text-sm font-medium">
                    {item.quantity} {item.unit}
                  </span>
                  <button
                    type="button"
                    onClick={() => adjustQty(item.id, 1)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--color-kitchen-border)] text-lg hover:border-[var(--color-kitchen-amber)]"
                  >
                    +
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
