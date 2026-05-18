const TABS = [
  { id: "pantry", label: "Pantry", icon: "🥦" },
  { id: "recipes", label: "Recipes", icon: "📖" },
  { id: "shopping", label: "Shopping", icon: "🛒", badge: true },
  { id: "history", label: "History", icon: "🍽️" },
  { id: "chat", label: "Chef AI", icon: "👨‍🍳" },
];

export default function TabNav({ active, onChange, shoppingCount }) {
  return (
    <nav className="sticky top-0 z-20 -mx-4 border-b border-[var(--color-kitchen-border)] bg-[var(--color-kitchen-bg)]/95 px-2 py-2 backdrop-blur-sm">
      <div className="flex gap-0.5 overflow-x-auto scrollbar-none">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          const badge =
            tab.badge && shoppingCount > 0 ? shoppingCount : null;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`relative shrink-0 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-[var(--color-kitchen-amber)]/15 text-[var(--color-kitchen-amber)]"
                  : "text-[var(--color-kitchen-muted)] hover:text-[var(--color-kitchen-cream)]"
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
              {badge != null && (
                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-kitchen-amber)] px-1 text-[10px] font-bold text-[#0f0f0f]">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
