"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { apiService } from "@/app/services/api.service";

export interface User {
  id: string;
  email: string;
  role: "admin" | "editor" | "reporter" | "user";
  hasReader: boolean;
  hasReporter: boolean;
  hasEditor: boolean;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  hasReader: boolean;
  hasEditor: boolean;
  isAdmin: boolean;
  refresh: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    if (process.env.NEXT_PUBLIC_AUTH_DISABLED === "true") {
      setUser({
        id: "auth-disabled-user",
        email: "dev@localhost",
        role: "admin",
        hasReader: true,
        hasReporter: true,
        hasEditor: true,
      });
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      const data = await apiService.get<{ user: User }>("/api/auth/verify");
      setUser(data.user);
    } catch {
      localStorage.removeItem("accessToken");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        hasReader: user?.hasReader ?? false,
        hasEditor: user?.hasEditor ?? false,
        isAdmin: user?.role === "admin",
        refresh: checkAuth,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
