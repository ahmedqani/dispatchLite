import { useEffect, useState } from "react";
import { AppShell } from "./components/AppShell";
import { ClientPage } from "./pages/Client";
import { DispatcherPage } from "./pages/Dispatcher";
import { TechnicianPage } from "./pages/Technician";

type AppView = "dispatcher" | "technician" | "client";

const parseViewFromHash = (): AppView => {
  const hash = window.location.hash.replace(/^#/, "");
  if (hash.startsWith("client")) {
    return "client";
  }
  if (hash === "technician") {
    return "technician";
  }
  return "dispatcher";
};

const App = () => {
  const [view, setView] = useState<AppView>(parseViewFromHash);

  useEffect(() => {
    const onHashChange = () => setView(parseViewFromHash());
    onHashChange();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const switchView = (next: AppView) => {
    window.location.hash = next;
    setView(next);
  };

  return (
    <AppShell
      title="Live Dispatch Board"
      activeView={view}
      onSelectView={switchView}
      tabs={[
        { id: "dispatcher", label: "Dispatcher" },
        { id: "technician", label: "Technician" },
        { id: "client", label: "Client" }
      ]}
    >
      {view === "dispatcher" ? (
        <DispatcherPage />
      ) : view === "technician" ? (
        <TechnicianPage />
      ) : (
        <ClientPage />
      )}
    </AppShell>
  );
};

export default App;
