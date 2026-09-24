// src/page/user/Userlayout.jsx
import React, { useEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { FaBars, FaTimes } from "react-icons/fa";
import UserNavbar from "./UserNavbar";

const TITLES = {
  "/user": "My Account",
  "/user/orders": "My Orders",
};

/**
 * Shared shell for every /user/* page. Sidebar + mobile menu stay mounted;
 * only <Outlet /> changes when you switch tabs.
 */
export default function UserLayout() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    setOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

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
    <div className="flex min-h-screen bg-gray-100">
      {/* Desktop sidebar */}
      <aside className="hidden md:block">
        <UserNavbar />
      </aside>

      <div className="flex-1 min-w-0">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-30 bg-gray-100 border-b">
          <div className="flex items-center justify-between p-3">
            <button
              aria-label="Open menu"
              onClick={() => setOpen(true)}
              className="p-2 rounded-md hover:bg-gray-200"
            >
              <FaBars />
            </button>
            <div className="font-bold text-xl">{TITLES[pathname] || "My Account"}</div>
            <div className="w-8" />
          </div>
        </header>

        {/* Mobile drawer */}
        {open && (
          <div className="md:hidden fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} aria-hidden="true" />
            <div
              ref={panelRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="User menu"
              className="absolute left-0 top-0 h-full w-[86%] max-w-xs bg-white shadow-lg overflow-y-auto outline-none"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <div className="font-semibold">Menu</div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="p-2 rounded-md hover:bg-gray-100"
                >
                  <FaTimes />
                </button>
              </div>
              <div className="p-4">
                <UserNavbar />
              </div>
            </div>
          </div>
        )}

        <main className="p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}