import type { ReactNode } from "react";

interface ShellTab {
  id: "dispatcher" | "technician" | "client";
  label: string;
}

interface AppShellProps {
  title: string;
  activeView: ShellTab["id"];
  tabs: ShellTab[];
  onSelectView: (view: ShellTab["id"]) => void;
  children: ReactNode;
}

const getTabClassName = (active: boolean): string =>
  [
    "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none",
    "focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
    active
      ? "bg-brand-600 text-white shadow-sm shadow-brand-900/10"
      : "text-slate-700 hover:-translate-y-px hover:bg-white hover:text-slate-900"
  ].join(" ");

export const AppShell = ({ title, activeView, tabs, onSelectView, children }: AppShellProps) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 shadow-sm shadow-slate-900/5 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">DispatchLite</p>
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">{title}</h1>
          </div>
          <nav aria-label="Application views" className="flex items-center gap-2 rounded-full bg-slate-100 p-1.5">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectView(tab.id)}
                className={getTabClassName(activeView === tab.id)}
                aria-current={activeView === tab.id ? "page" : undefined}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">{children}</main>
    </div>
  );
};
