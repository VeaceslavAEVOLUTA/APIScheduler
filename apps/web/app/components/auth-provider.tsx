"use client";

import { createContext, useContext, useEffect, useState } from "react";

type AuthState = {
  token: string | null;
  userId: string | null;
  workspaceId: string | null;
};

type AuthContextValue = AuthState & {
  setAuth: (value: AuthState) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ token: null, userId: null, workspaceId: null });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");
    const workspaceId = localStorage.getItem("workspaceId");
    setState({ token, userId, workspaceId });
  }, []);

  const setAuth = (value: AuthState) => {
    setState(value);
    if (value.token) localStorage.setItem("token", value.token);
    else localStorage.removeItem("token");
    if (value.userId) localStorage.setItem("userId", value.userId);
    else localStorage.removeItem("userId");
    if (value.workspaceId) localStorage.setItem("workspaceId", value.workspaceId);
    else localStorage.removeItem("workspaceId");
  };

  const logout = () => setAuth({ token: null, userId: null, workspaceId: null });

  return <AuthContext.Provider value={{ ...state, setAuth, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider missing");
  return ctx;
}
