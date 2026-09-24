import React, { useEffect, useState } from "react";
import axios from "axios";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/UserContext";
import Spinner from "../Spinner";

export default function PrivateRoutes() {
  const [ok, setOk] = useState(false);
  const [auth] = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

  useEffect(() => {
    let mounted = true;

    const checkUser = async () => {
      try {
        // Same fix as AdminRoute: check the token field directly instead of
        // the truthiness of the whole `auth` object, which is never falsy
        // even before the context has hydrated from localStorage.
        let stored = null;
        try {
          stored = JSON.parse(localStorage.getItem("auth"));
        } catch {
          stored = null;
        }
        const token = auth?.token || stored?.token;

        if (!token) {
          if (mounted) {
            setChecking(false);
            navigate("/login");
          }
          return;
        }

        const res = await axios.get(`${API_BASE}/api/auth/user-auth`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res?.data?.ok) {
          if (mounted) setOk(true);
        } else if (mounted) {
          navigate("/login");
        }
      } catch (err) {
        console.error("User check failed", err);
        if (mounted) navigate("/login");
      } finally {
        if (mounted) setChecking(false);
      }
    };

    checkUser();

    return () => {
      mounted = false;
    };
  }, [auth, navigate, API_BASE]);

  if (checking) return <Spinner message="Checking user access..." />;

  return ok ? <Outlet /> : null;
}