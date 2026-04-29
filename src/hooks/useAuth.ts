"use client";

import { useState, useEffect } from "react";
import { apiService } from "@/app/services/api.service";

export interface User {
  id: string;
  email: string;
  role: "admin" | "editor" | "reporter" | "user";
  hasReader: boolean;
  hasReporter: boolean;
  hasEditor: boolean;
}

export interface UseAuthResult {
  user: User | null;
  loading: boolean;
  hasReader: boolean;
  hasEditor: boolean;
  isAdmin: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          setLoading(false);
          return;
        }

        const data = await apiService.get<{ user: User }>("/api/auth/verify");
        setUser(data.user);
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("accessToken");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  return {
    user,
    loading,
    hasReader: user?.hasReader ?? false,
    hasEditor: user?.hasEditor ?? false,
    isAdmin: user?.role === "admin"
  };
}
