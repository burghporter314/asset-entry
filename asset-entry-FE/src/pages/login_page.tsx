import React, { useState } from "react";
import { useAuth } from "../Contexts/AuthContext";

const API = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

type Mode = "login" | "register";

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === "register") {
      if (username.trim().length < 3) { setError("Username must be at least 3 characters."); return; }
      if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
      if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    }

    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const res = await fetch(`${API}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.detail || "Something went wrong."); return; }

      login({
        token:     data.token,
        username:  data.username,
        isAdmin:   data.is_admin   ?? false,
        isStatic:  data.is_static  ?? false,
        canRead:   data.can_read   ?? true,
        canCreate: data.can_create ?? true,
        canDelete: data.can_delete ?? true,
      });
    } catch {
      setError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(m => m === "login" ? "register" : "login");
    setError(null);
    setPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="login-page">
      <div className="login-card card-modern">
        <div className="login-header">
          <div className="app-navbar-brand" style={{ justifyContent: "center", marginBottom: "0.5rem" }}>
            <span className="brand-dot">A</span>
            <span className="brand-name">AssetTracker</span>
          </div>
          <p className="login-subtitle">
            {mode === "login" ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-field">
            <label className="form-field-label" htmlFor="username">Username</label>
            <input id="username" type="text" className="form-control" value={username}
              onChange={e => setUsername(e.target.value)} autoComplete="username" autoFocus required />
          </div>

          <div className="login-field">
            <label className="form-field-label" htmlFor="password">Password</label>
            <input id="password" type="password" className="form-control" value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"} required />
          </div>

          {mode === "register" && (
            <div className="login-field">
              <label className="form-field-label" htmlFor="confirm-password">Confirm Password</label>
              <input id="confirm-password" type="password" className="form-control" value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)} autoComplete="new-password" required />
            </div>
          )}

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="btn-add login-submit" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="login-footer">
          {mode === "login" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <span>Don't have an account? <button className="btn-link" onClick={switchMode}>Register</button></span>
              <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                Forgot your password? Contact an administrator.
              </span>
            </div>
          ) : (
            <span>Already have an account? <button className="btn-link" onClick={switchMode}>Sign In</button></span>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
