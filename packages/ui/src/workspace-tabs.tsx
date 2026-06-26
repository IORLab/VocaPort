export type WorkspaceTabId = "import" | "library" | "study";

export interface WorkspaceTabItem {
  id: WorkspaceTabId;
  label: string;
  detail: string;
  badge?: string;
}

interface WorkspaceTabsProps {
  activeTabId: WorkspaceTabId;
  tabs: WorkspaceTabItem[];
  onSelect(tabId: WorkspaceTabId): void;
}

export function WorkspaceTabs({
  activeTabId,
  tabs,
  onSelect,
}: WorkspaceTabsProps) {
  return (
    <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/80 p-2 shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
      <div
        aria-label="工作区导航"
        className="grid gap-2 sm:grid-cols-3"
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;

          return (
            <button
              aria-label={tab.label}
              key={tab.id}
              aria-selected={isActive}
              className={[
                "rounded-[1.25rem] border px-4 py-3 text-left transition",
                isActive
                  ? "border-sky-400/40 bg-sky-400/12 text-white"
                  : "border-slate-800 bg-slate-900/70 text-slate-300 hover:border-slate-700 hover:text-white",
              ].join(" ")}
              role="tab"
              type="button"
              onClick={() => onSelect(tab.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">{tab.label}</span>
                {tab.badge ? (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                    {tab.badge}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">{tab.detail}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
