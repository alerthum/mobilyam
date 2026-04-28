import React from "react";
import Sidebar from "./Sidebar.jsx";
import BottomNav from "./BottomNav.jsx";

export default function AppShell({ activeView, onNavigate, children }) {
  return (
    <div className="min-h-screen flex max-w-[100vw] overflow-x-hidden bg-surface-50">
      <Sidebar activeView={activeView} onNavigate={onNavigate} />
      <main className="flex-1 min-w-0 pb-[calc(3.6rem+env(safe-area-inset-bottom))] lg:pb-0 max-w-full overflow-x-hidden">
        {children}
      </main>
      <BottomNav activeView={activeView} onNavigate={onNavigate} />
    </div>
  );
}
