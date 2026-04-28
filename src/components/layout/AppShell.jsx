import React from "react";
import Sidebar from "./Sidebar.jsx";
import BottomNav from "./BottomNav.jsx";

export default function AppShell({ activeView, onNavigate, children }) {
  return (
    <div className="min-h-screen flex">
      <Sidebar activeView={activeView} onNavigate={onNavigate} />
      <main className="flex-1 min-w-0 pb-24 lg:pb-0">
        {children}
      </main>
      <BottomNav activeView={activeView} onNavigate={onNavigate} />
    </div>
  );
}
