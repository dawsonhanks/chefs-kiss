import StatCard from "./StatCard";
import { RATINGS } from "../utils/constants";
import {
  formatDate,
  historyStats,
  monthKey,
  monthLabel,
  ratingEmoji,
} from "../utils/helpers";

export default function HistoryTab({ data, setData }) {
  const stats = historyStats(data.cookHistory);

  const grouped = data.cookHistory.reduce((acc, entry) => {
    const key = monthKey(entry.date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  const months = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const updateEntry = (id, patch) => {
    setData((d) => ({
      ...d,
      cookHistory: d.cookHistory.map((h) =>
        h.id === id ? { ...h, ...patch } : h
      ),
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <StatCard label="Meals Cooked" value={stats.total} accent />
        <StatCard
          label="Avg Rating"
          value={
            stats.avgRating
              ? `${ratingEmoji(Math.round(stats.avgRating))} ${stats.avgRating.toFixed(1)}`
              : "—"
          }
        />
        <StatCard label="Most Cooked" value={stats.topRecipe} />
      </div>

      {months.length === 0 && (
        <p className="py-8 text-center text-sm text-[var(--color-kitchen-muted)]">
          No meals logged yet. Cook a recipe and tap &quot;Log as Cooked&quot;.
        </p>
      )}

      {months.map((key) => (
        <section key={key}>
          <h3 className="mb-3 font-serif text-lg font-semibold text-[var(--color-kitchen-amber)]">
            {monthLabel(key)}
          </h3>
          <ul className="space-y-3">
            {grouped[key].map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-card)] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-medium">{entry.recipeName}</h4>
                    <p className="text-xs text-[var(--color-kitchen-muted)]">
                      {formatDate(entry.date)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex gap-1">
                  {RATINGS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => updateEntry(entry.id, { rating: r.value })}
                      className={`rounded-lg px-2 py-1 text-lg transition ${
                        entry.rating === r.value
                          ? "bg-[var(--color-kitchen-amber)]/20 ring-1 ring-[var(--color-kitchen-amber)]"
                          : "opacity-50 hover:opacity-100"
                      }`}
                      title={r.label}
                    >
                      {r.emoji}
                    </button>
                  ))}
                </div>

                <textarea
                  placeholder="Notes (optional)"
                  value={entry.notes || ""}
                  onChange={(e) =>
                    updateEntry(entry.id, { notes: e.target.value })
                  }
                  rows={2}
                  className="mt-3 w-full resize-none rounded-lg border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-kitchen-amber)]"
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
