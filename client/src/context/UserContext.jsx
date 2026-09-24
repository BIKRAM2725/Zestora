// src/context/UserContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

const AuthContext = createContext();

const EMPTY_AUTH = { user: null, token: "" };

// Read localStorage synchronously so the very first render already knows
// whether the user is signed in (no "empty auth" flash, no redirect on refresh).
const readStoredAuth = () => {
  try {
    const raw = localStorage.getItem("auth");
    if (!raw) return EMPTY_AUTH;
    const parsed = JSON.parse(raw);
    return { user: parsed?.user || null, token: parsed?.token || "" };
  } catch {
    return EMPTY_AUTH;
  }
};

export const UserProvider = ({ children }) => {
  const [auth, setAuth] = useState(readStoredAuth);

  // Keep the axios default header in sync on login / logout
  useEffect(() => {
    if (auth?.token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${auth.token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [auth?.token]);

  return <AuthContext.Provider value={[auth, setAuth]}>{children}</AuthContext.Provider>;
};

// Hook
export const useAuth = () => useContext(AuthContext);