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
import ProducerSummaryPage from "./pages/ProducerSummaryPage.jsx";
import QuoteEditorPage from "./pages/QuoteEditorPage.jsx";
import AppShell from "./components/layout/AppShell.jsx";
import ChamberBroadcastDock from "./components/layout/ChamberBroadcastDock.jsx";
import { useProjectActions } from "./hooks/useProjectActions.js";
import { useToast } from "./context/ModalContext.jsx";

/**
 * Basit "current view" tabanlı router.
 * URL hash kullanılmıyor — state yeterince hafif.
 */
function Router() {
  const { remote, auth, bootstrapped } = useApp();
  const user = useCurrentUser();
  const toast = useToast();
  const [view, setView] = useState("home");
  const [route, setRoute] = useState(null); // {type:"quote", projectId, quoteId}
  const actions = useProjectActions();

  useEffect(() => {
    if (!user?.role) return;
    setView((v) => {
      if (user.role === "system_admin") return v === "users" || v === "profile" ? v : "users";
      if (user.role === "chamber") {
        return ["users", "dashboard", "settings", "profile"].includes(v) ? v : "users";
      }
      return v === "profile" ? v : v;
    });
  }, [user?.id, user?.role]);

  const goHome = useCallback(() => {
    setRoute(null);
    setView(
      user?.role === "system_admin" || user?.role === "chamber" ? "users" : "home"
    );
  }, [user?.role]);

  const openQuote = useCallback(
    (projectId, quoteId) => {
      if (user?.role === "system_admin") {
        toast.warning("Teklif düzenleme yalnızca mobilyacı hesapları içindir.");
        return;
      }
      setRoute({ type: "quote", projectId, quoteId });
    },
    [user?.role, toast]
  );

  const handleCreateProject = useCallback(() => {
    if (user?.role === "system_admin") {
      toast.warning("Sistem yöneticisi teklif veya proje oluşturamaz.");
      return undefined;
    }
    const id = actions.createProject();
    const proj = (remote?.projects || []).find((p) => p.id === id);
    const quote = proj?.quotes?.[0];
    if (proj && quote) {
      // Defer one tick so updateRemote applied first, sonra editöre açılır.
      setTimeout(() => openQuote(proj.id, quote.id), 50);
    }
    return id;
  }, [actions, openQuote, remote, toast, user?.role]);

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
      case "producerInsights":
        content = <ProducerSummaryPage />;
        break;
      case "dashboard":
        content = <DashboardPage />;
        break;
      case "settings":
        content = <PricesPage />;
        break;
      default:
        content =
          user?.role === "system_admin" || user?.role === "chamber" ? (
            <UsersPage />
          ) : (
            <HomePage
              onCreateProject={handleCreateProject}
              onOpenQuote={openQuote}
            />
          );
    }
  }

  function navigate(next) {
    if (user?.role === "system_admin" && !["users", "profile"].includes(next)) {
      toast.warning("Bu menü için yalnızca oda yöneticisi veya mobilyacı oturumu gerekir.");
      setView("users");
      setRoute(null);
      return;
    }
    if (
      user?.role === "chamber" &&
      !["users", "dashboard", "settings", "profile"].includes(next)
    ) {
      toast.warning("Bu bölüme buradan erişemezsiniz.");
      setView("users");
      setRoute(null);
      return;
    }
    setRoute(null);
    setView(next);
  }

  function handleCreate() {
    handleCreateProject();
  }

  return (
    <>
      <AppShell activeView={view} onNavigate={navigate}>
        {content}
      </AppShell>
      <ChamberBroadcastDock />
    </>
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
