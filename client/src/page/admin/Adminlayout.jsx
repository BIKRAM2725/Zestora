// src/page/admin/Adminlayout.jsx
import React, { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { FaBars } from "react-icons/fa";
import AdminNavbar from "./AdminNavbar";

const TITLES = {
  "/admin": "Admin Details",
  "/admin/details": "Admin Details",
  "/admin/item": "Manage Post",
  "/admin/create-category": "Manage Category",
  "/admin/orders": "All Orders",
  "/admin/return-orders": "Return Orders",
  "/admin/payments": "Payments",
  "/admin/activation": "Activation",
};

/**
 * Shared shell for every /admin/* page.
 * The sidebar and mobile menu live HERE, so they stay mounted while only <Outlet /> changes.
 */
export default function AdminLayout() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  // On every page change: close the mobile menu and go back to the top
  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  // Mobile drawer: lock body scroll, focus the panel, close on Escape
  useEffect(() => {
    if (!open) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="min-h-screen bg-gradient-to-r from-gray-100 to-gray-200">
      <div className="flex">
        {/* Sidebar (md+) */}
        <aside className="hidden md:block">
          <AdminNavbar />
        </aside>

        <div className="flex-1 min-w-0">
          {/* Mobile header */}
          <header className="md:hidden bg-white shadow sticky top-0 z-30">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                aria-label="Open menu"
                className="p-2 rounded-md hover:bg-gray-100"
                onClick={() => setOpen(true)}
              >
                <FaBars size={20} />
              </button>
              <div className="text-lg font-semibold">{TITLES[pathname] || "Admin"}</div>
              <div className="w-8" />
            </div>
          </header>

          {/* Mobile slide-over */}
          {open && (
            <div className="md:hidden fixed inset-0 z-50">
              <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden="true" />
              <div
                ref={panelRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label="Admin menu"
                className="absolute right-0 top-0 h-full w-[86%] max-w-xs bg-white shadow-lg overflow-auto p-3 outline-none"
              >
                <AdminNavbar variant="inline" onClose={() => setOpen(false)} />
              </div>
            </div>
          )}

          {/* Page content swaps here */}
          <main className="p-4 sm:p-6 lg:p-10">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}