export default function StatCard({ label, value, accent }) {
  return (
    <div className="flex-1 min-w-[calc(50%-6px)] rounded-xl border border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-card)] px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-wider text-[var(--color-kitchen-muted)]">
        {label}
      </p>
      <p
        className={`font-serif text-xl font-semibold ${
          accent ? "text-[var(--color-kitchen-amber)]" : "text-[var(--color-kitchen-cream)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
