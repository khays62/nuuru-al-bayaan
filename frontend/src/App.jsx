import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import Navbar from "./components/layout/Navbar";
import { navItems } from "./config/navigation";

export default function App() {
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setCollapsed] = useState(false);

  const location = useLocation();
  const currentNavItem = navItems.find((item) =>
    location.pathname.startsWith(item.path)
  );
  const currentPageTitle = currentNavItem ? currentNavItem.label : "Dashboard";

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        isMobileMenuOpen={isMobileMenuOpen}
        isCollapsed={isCollapsed}
        closeMobileMenu={() => setMobileMenuOpen(false)}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar
          onToggleMobileMenu={() => setMobileMenuOpen(!isMobileMenuOpen)}
          onToggleCollapse={() => setCollapsed(!isCollapsed)}
          isCollapsed={isCollapsed}
          currentPageTitle={currentPageTitle}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet /> {/* 👈 Renders children (dashboard, students, etc.) */}
        </main>
      </div>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}