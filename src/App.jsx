import React, { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { AppProvider, useApp, useCurrentUser } from "./context/AppContext.jsx";
import { ModalProvider } from "./context/ModalContext.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import PricesPage from "./pages/PricesPage.jsx";
import ContractsPage from "./pages/ContractsPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import UsersPage from "./pages/UsersPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import QuoteEditorPage from "./pages/QuoteEditorPage.jsx";
import AppShell from "./components/layout/AppShell.jsx";
import { useProjectActions } from "./hooks/useProjectActions.js";

/**
 * Basit "current view" tabanlı router.
 * URL hash kullanılmıyor — state yeterince hafif.
 */
function Router() {
  const { remote, auth, bootstrapped } = useApp();
  const user = useCurrentUser();
  const [view, setView] = useState("home");
  const [route, setRoute] = useState(null); // {type:"quote", projectId, quoteId}
  const actions = useProjectActions();

  const goHome = useCallback(() => {
    setRoute(null);
    setView("home");
  }, []);

  const openQuote = useCallback((projectId, quoteId) => {
    setRoute({ type: "quote", projectId, quoteId });
  }, []);

  const handleCreateProject = useCallback(() => {
    const id = actions.createProject();
    const proj = (remote?.projects || []).find((p) => p.id === id);
    const quote = proj?.quotes?.[0];
    if (proj && quote) {
      // Defer one tick so updateRemote applied first, sonra editöre açılır.
      setTimeout(() => openQuote(proj.id, quote.id), 50);
    }
    return id;
  }, [actions, openQuote, remote]);

  // İlk açılış henüz tamamlanmadı veya oturum yoksa — login
  if (!bootstrapped) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3 text-ink-500">
          <Loader2 size={18} className="animate-spin" />
          Yükleniyor…
        </div>
      </div>
    );
  }

  if (!auth || !remote) {
    return <LoginPage />;
  }

  // Aktif sayfa
  let content;
  if (route?.type === "quote") {
    content = (
      <QuoteEditorPage
        projectId={route.projectId}
        quoteId={route.quoteId}
        onBack={goHome}
        onOpenContract={(pid, qid) => openQuote(pid, qid)}
      />
    );
  } else {
    switch (view) {
      case "home":
        content = (
          <HomePage
            onCreateProject={handleCreateProject}
            onOpenQuote={openQuote}
          />
        );
        break;
      case "prices":
        content = <PricesPage />;
        break;
      case "contracts":
        content = <ContractsPage onOpenContract={openQuote} />;
        break;
      case "profile":
        content = <ProfilePage />;
        break;
      case "users":
        content = <UsersPage />;
        break;
      case "dashboard":
        content = <DashboardPage />;
        break;
      case "settings":
        content = <PricesPage />;
        break;
      default:
        content = (
          <HomePage
            onCreateProject={handleCreateProject}
            onOpenQuote={openQuote}
          />
        );
    }
  }

  function navigate(next) {
    setRoute(null);
    setView(next);
  }

  function handleCreate() {
    handleCreateProject();
  }

  return (
    <AppShell activeView={view} onNavigate={navigate} onCreate={handleCreate}>
      {content}
    </AppShell>
  );
}

export default function App() {
  return (
    <ModalProvider>
      <AppProvider>
        <Router />
      </AppProvider>
    </ModalProvider>
  );
}
