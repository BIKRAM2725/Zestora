// src/components/routes/Private.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../context/UserContext";
import Spinner from "../Spinner";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

/**
 * Guards /user/* routes.
 * - Verifies the token with the server ONCE per token (not on every click / route change).
 * - Redirects with <Navigate>, so `navigate` is not an effect dependency.
 * - Auth state is already correct on first render (see UserContext), so a refresh keeps you signed in.
 *
 * status: "checking" | "allowed" | "denied" | "error"
 */
export default function PrivateRoutes() {
  const [auth, setAuth] = useAuth();
  const location = useLocation();
  const token = auth?.token;

  const [status, setStatus] = useState(token ? "checking" : "denied");

  useEffect(() => {
    if (!token) {
      setStatus("denied");
      return;
    }

    let cancelled = false;
    setStatus("checking");

    axios
      .get(`${API_BASE}/api/auth/user-auth`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        if (!cancelled) setStatus(res?.data?.ok ? "allowed" : "denied");
      })
      .catch((err) => {
        if (cancelled) return;
        const code = err?.response?.status;
        if (code === 401 || code === 403) {
          // Token is invalid or expired: sign out for real
          localStorage.removeItem("auth");
          setAuth({ user: null, token: "" });
          setStatus("denied");
        } else {
          // Network/server problem: don't log the user out because of it
          console.error("User check failed", err);
          setStatus("error");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token, setAuth]); // token only — not `navigate`, not the whole `auth` object

  if (status === "checking") return <Spinner message="Checking user access..." />;

  if (status === "denied") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (status === "error") {
    return <p className="text-center mt-10 text-gray-600">Can't reach the server. Please refresh and try again.</p>;
  }

  return <Outlet />;
}