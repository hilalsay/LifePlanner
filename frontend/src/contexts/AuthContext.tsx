import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SESSION_EXPIRED_EVENT } from "@/lib/api";

export interface User {
  id: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  provider: string;
  created_at: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: { display_name?: string; avatar_url?: string }) => Promise<void>;
  uploadAvatar: (file: File) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const BASE = "/api/v1";

async function fetchMe(): Promise<User | null> {
  const res = await fetch(`${BASE}/auth/me`, { credentials: "include" });
  if (res.ok) return res.json() as Promise<User>;
  return null;
}

async function fetchRefresh(): Promise<boolean> {
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  return res.ok;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        let me = await fetchMe();
        if (!me) {
          const refreshed = await fetchRefresh();
          if (refreshed) {
            me = await fetchMe();
          }
        }
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-logout when an API call reports the session can't be refreshed.
  const logoutRef = useRef<() => void>(() => {});
  useEffect(() => {
    const handler = () => logoutRef.current();
    window.addEventListener(SESSION_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
  }, []);

  async function login(email: string, password: string): Promise<void> {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    const data: User = await res.json();
    setUser(data);
  }

  async function register(
    email: string,
    password: string,
    displayName?: string
  ): Promise<void> {
    const body: Record<string, string> = { email, password };
    if (displayName) body.display_name = displayName;

    const res = await fetch(`${BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    const data: User = await res.json();
    setUser(data);
  }

  async function updateProfile(data: { display_name?: string; avatar_url?: string }): Promise<void> {
    const res = await fetch(`${BASE}/auth/me`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    const updated: User = await res.json();
    setUser(updated);
  }

  async function uploadAvatar(file: File): Promise<void> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/auth/me/avatar`, {
      method: "POST",
      credentials: "include",
      body: form, // let the browser set the multipart boundary
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `HTTP ${res.status}`);
    }
    const updated: User = await res.json();
    setUser(updated);
  }

  async function logout(): Promise<void> {
    try {
      await fetch(`${BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // swallow network errors — we still clear state
    }
    setUser(null);
    window.location.href = "/login";
  }

  // Keep the event handler pointed at the latest logout.
  logoutRef.current = logout;

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateProfile, uploadAvatar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
