"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type User = { _id: string; email: string; username?: string; fullName?: string; role?: string; country?: string; avatar?: string };

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string, country?: string, fullName?: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("auth_token");
    const u = localStorage.getItem("auth_user");
    if (t) setToken(t);
    if (u && u !== "undefined" && u !== "null") {
      try {
        setUser(JSON.parse(u));
      } catch (error) {
        console.error("Failed to parse user data from localStorage:", error);
        localStorage.removeItem("auth_user");
      }
    }
    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const data = await apiFetch<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("auth_user", JSON.stringify(data.user));
  }

  async function signup(username: string, email: string, password: string, country?: string, fullName?: string) {
    await apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password, country, fullName }),
    });
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  }

  async function refresh() {
    const t = localStorage.getItem("auth_token");
    if (!t) return;
    const me = await apiFetch<{ success: boolean; user: User }>("/auth/me", {}, t);
    if (me?.user) {
      setUser(me.user);
      localStorage.setItem("auth_user", JSON.stringify(me.user));
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}


