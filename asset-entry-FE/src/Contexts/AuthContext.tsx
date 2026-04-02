import React, { createContext, useContext, useState, useEffect } from "react";

export interface AuthUser {
  token: string;
  username: string;
  isAdmin: boolean;
  isStatic: boolean;
  canRead: boolean;
  canCreate: boolean;
  canDelete: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function load(): AuthUser | null {
  const raw = localStorage.getItem("auth");
  try {
    if (!raw) return null;
    const user = JSON.parse(raw) as AuthUser;
    const parts = user.token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem("auth");
        return null;
      }
    }
    return user;
  } catch { return null; }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(load);

  useEffect(() => {
    const handle = () => {
      localStorage.removeItem("auth");
      setUser(null);
    };
    window.addEventListener('auth:expired', handle);
    return () => window.removeEventListener('auth:expired', handle);
  }, []);

  const login = (u: AuthUser) => {
    localStorage.setItem("auth", JSON.stringify(u));
    setUser(u);
  };

  const logout = () => {
    localStorage.removeItem("auth");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
