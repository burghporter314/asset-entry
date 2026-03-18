import React, { createContext, useContext, useState } from "react";

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
  try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(load);

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
