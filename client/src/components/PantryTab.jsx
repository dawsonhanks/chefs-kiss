import { useCallback, useState } from "react";
import BarcodeScanner from "./BarcodeScanner";
import StatCard from "./StatCard";
import { CATEGORIES, UNITS } from "../utils/constants";
import {
  addItemsToShoppingList,
  countMakeableRecipes,
  expiresSoon,
  getRestockItems,
  isExpired,
  normalizeName,
  pantryStatus,
  uid,
} from "../utils/helpers";
import { lookupBarcode } from "../utils/productLookup";
import UseItUpSection from "./UseItUpSection";

export default function PantryTab({ data, setData, onTabChange }) {
  const [form, setForm] = useState({
    name: "",
    quantity: 1,
    unit: "whole",
    category: "Other",
    expiryDate: "",
  });
  const [showForm, setShowForm] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [lookupState, setLookupState] = useState(null);
  const [scannedImage, setScannedImage] = useState(null);

  const pantry = data.pantry;
  const lowCount = pantry.filter((p) => pantryStatus(p) === "low").length;
  const outCount = pantry.filter((p) => pantryStatus(p) === "out").length;
  const makeable = countMakeableRecipes(data.recipes, pantry);

  const addItem = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const qty = Number(form.quantity) || 0;
    setData((d) => {
      const key = normalizeName(form.name);
      const existing = d.pantry.find((p) => normalizeName(p.name) === key);
      if (existing) {
        return {
          ...d,
          pantry: d.pantry.map((p) =>
            p.id === existing.id ? { ...p, quantity: p.quantity + qty } : p
          ),
        };
      }
      return {
        ...d,
        pantry: [
          ...d.pantry,
          {
            id: uid(),
            name: form.name.trim(),
            quantity: qty,
            unit: form.unit,
            category: form.category,
            expiryDate: form.expiryDate || null,
            lowThreshold: 1,
          },
        ],
      };
    });
    setForm({
      name: "",
      quantity: 1,
      unit: "whole",
      category: "Other",
      expiryDate: "",
    });
    setShowForm(false);
    setScannedImage(null);
    setLookupState(null);
  };

  const handleBarcodeScan = useCallback(async (code) => {
    setLookupState({ status: "loading" });
    setShowForm(true);

    try {
      const product = await lookupBarcode(code);
      if (product) {
        setForm({
          name: product.name,
          quantity: product.quantity,
          unit: product.unit,
          category: CATEGORIES.includes(product.category)
            ? product.category
            : "Other",
          expiryDate: "",
        });
        setScannedImage(product.imageUrl);
        setLookupState({ status: "found", barcode: product.barcode });
      } else {
        setForm((f) => ({ ...f, name: "" }));
        setScannedImage(null);
        setLookupState({
          status: "not_found",
          barcode: String(code).replace(/\D/g, ""),
        });
      }
    } catch {
      setScannedImage(null);
      setLookupState({
        status: "error",
        barcode: String(code).replace(/\D/g, ""),
      });
    } finally {
      setShowScanner(false);
    }
  }, []);

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

  const restockItems = getRestockItems(pantry);
  const sorted = [...pantry].sort((a, b) => a.name.localeCompare(b.name));

  const restockOne = (item) => {
    setData((d) => ({
      ...d,
      shoppingList: addItemsToShoppingList(
        d.shoppingList,
        [
          {
            name: item.name,
            quantity: Math.max(
              1,
              (item.lowThreshold ?? 1) * 2 - item.quantity
            ),
            unit: item.unit,
          },
        ],
        "restock"
      ),
    }));
    onTabChange?.("shopping");
  };

  const restockAll = () => {
    if (!restockItems.length) return;
    setData((d) => ({
      ...d,
      shoppingList: addItemsToShoppingList(
        d.shoppingList,
        restockItems,
        "restock"
      ),
    }));
    onTabChange?.("shopping");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <StatCard label="Total Items" value={pantry.length} />
        <StatCard label="Running Low" value={lowCount} accent={lowCount > 0} />
        <StatCard label="Out of Stock" value={outCount} accent={outCount > 0} />
        <StatCard label="Recipes I Can Make" value={makeable} accent />
      </div>

      <UseItUpSection
        data={data}
        onSelectRecipe={() => onTabChange?.("recipes")}
      />

      {restockItems.length > 0 && (
        <button
          type="button"
          onClick={restockAll}
          className="w-full rounded-xl border border-[var(--color-kitchen-warning)]/40 bg-[var(--color-kitchen-warning)]/10 py-2.5 text-sm font-medium text-[var(--color-kitchen-warning)] transition hover:bg-[var(--color-kitchen-warning)]/20"
        >
          Restock {restockItems.length} low item
          {restockItems.length !== 1 ? "s" : ""} → Shopping
        </button>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            setShowForm(!showForm);
            if (showForm) {
              setLookupState(null);
              setScannedImage(null);
            }
          }}
          className="rounded-xl border border-dashed border-[var(--color-kitchen-amber)]/40 py-2.5 text-sm font-medium text-[var(--color-kitchen-amber)] transition hover:bg-[var(--color-kitchen-amber)]/10"
        >
          {showForm ? "Cancel" : "+ Add"}
        </button>
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          className="rounded-xl border border-[var(--color-kitchen-amber)]/40 bg-[var(--color-kitchen-amber)]/10 py-2.5 text-sm font-medium text-[var(--color-kitchen-amber)] transition hover:bg-[var(--color-kitchen-amber)]/20"
        >
          Scan Barcode
        </button>
      </div>

      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showForm && (
        <form
          onSubmit={addItem}
          className="space-y-3 rounded-xl border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-card)] p-4"
        >
          {lookupState?.status === "loading" && (
            <p className="text-center text-sm text-[var(--color-kitchen-muted)]">
              Looking up product…
            </p>
          )}
          {lookupState?.status === "found" && (
            <p className="text-center text-xs text-[var(--color-kitchen-success)]">
              Product found — review and add to pantry
            </p>
          )}
          {lookupState?.status === "not_found" && (
            <p className="text-center text-xs text-[var(--color-kitchen-warning)]">
              Product not in database — enter the name manually
            </p>
          )}
          {lookupState?.status === "error" && (
            <p className="text-center text-xs text-[var(--color-kitchen-warning)]">
              Lookup failed — enter details manually
            </p>
          )}
          {scannedImage && (
            <img
              src={scannedImage}
              alt=""
              className="mx-auto h-20 w-20 rounded-lg object-contain bg-white/10"
            />
          )}
          <input
            required
            placeholder="Ingredient name"
            disabled={lookupState?.status === "loading"}
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
                {(status === "low" || status === "out") && (
                  <button
                    type="button"
                    onClick={() => restockOne(item)}
                    className="rounded-lg border border-[var(--color-kitchen-amber)]/40 px-2.5 py-1 text-xs font-medium text-[var(--color-kitchen-amber)] hover:bg-[var(--color-kitchen-amber)]/10"
                    title="Add to shopping list"
                  >
                    + Shop
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
