// src/hooks/useLogout.js
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/UserContext";
import { clearAllCache } from "./useCachedData";

/**
 * Returns a logout() function:
 *  1. removes the "auth" entry from localStorage
 *  2. clears every cached page-data entry (so the next login never sees this user's data)
 *  3. resets the auth context (Navbar, cart and route guards update immediately;
 *     UserContext also removes the axios Authorization header)
 *  4. goes to the home page
 */
export default function useLogout() {
  const [, setAuth] = useAuth();
  const navigate = useNavigate();

  return useCallback(() => {
    localStorage.removeItem("auth");
    clearAllCache();
    setAuth({ user: null, token: "" });
    toast.success("Logged out successfully");
    navigate("/", { replace: true });
  }, [setAuth, navigate]);
}