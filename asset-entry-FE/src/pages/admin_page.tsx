import React, { useEffect, useState } from "react";
import {
  adminGetUsers, adminResetPassword, adminUpdatePermissions, adminDeleteUser, adminStripAssetDashes,
  type AdminUser,
} from "../services/entry_service";
import { useExpensesContext } from "../Contexts/ExpenseContext";
import { useAuth } from "../Contexts/AuthContext";

const AdminPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { setData } = useExpensesContext();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reset password modal
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Strip dashes
  const [stripLoading, setStripLoading] = useState(false);
  const [stripResult, setStripResult] = useState<string | null>(null);
  const [stripError, setStripError] = useState<string | null>(null);
  const [stripConfirm, setStripConfirm] = useState(false);

  // Per-row perm saving state
  const [permSaving, setPermSaving] = useState<Record<number, boolean>>({});
  const [permError, setPermError] = useState<Record<number, string>>({});

  useEffect(() => {
    adminGetUsers()
      .then(setUsers)
      .catch(() => setError("Failed to load users."))
      .finally(() => setLoading(false));
  }, []);

  // ── Permission toggle ────────────────────────────────

  const togglePerm = async (user: AdminUser, perm: "can_read" | "can_create" | "can_delete") => {
    const updated = { can_read: user.can_read, can_create: user.can_create, can_delete: user.can_delete };
    updated[perm] = !updated[perm];

    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, ...updated } : u));
    setPermSaving(prev => ({ ...prev, [user.id]: true }));
    setPermError(prev => ({ ...prev, [user.id]: "" }));

    try {
      await adminUpdatePermissions(user.id, updated);
    } catch (err: unknown) {
      // Revert on failure
      setUsers(prev => prev.map(u => u.id === user.id ? user : u));
      setPermError(prev => ({
        ...prev,
        [user.id]: err instanceof Error ? err.message : "Failed to save",
      }));
    } finally {
      setPermSaving(prev => ({ ...prev, [user.id]: false }));
    }
  };

  // ── Strip dashes ─────────────────────────────────────

  const handleStripDashes = async () => {
    setStripLoading(true);
    setStripResult(null);
    setStripError(null);
    setStripConfirm(false);
    try {
      const result = await adminStripAssetDashes();
      setStripResult(result.message);
      // Patch local context data so the table reflects immediately
      setData(prev => prev.map(e => ({ ...e, assetId: e.assetId.replace(/-/g, '') })));
    } catch (err: unknown) {
      setStripError(err instanceof Error ? err.message : "Failed to strip dashes");
    } finally {
      setStripLoading(false);
    }
  };

  // ── Delete user ──────────────────────────────────────

  const handleDelete = async (userId: number) => {
    try {
      await adminDeleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setDeleteConfirm(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  // ── Reset password ───────────────────────────────────

  const openReset = (user: AdminUser) => {
    setResetTarget(user);
    setNewPassword("");
    setConfirmPassword("");
    setResetError(null);
    setResetSuccess(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    if (newPassword.length < 6) { setResetError("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { setResetError("Passwords do not match."); return; }

    setSaving(true);
    try {
      await adminResetPassword(resetTarget!.id, newPassword);
      setResetSuccess(true);
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ───────────────────────────────────────────

  const PermToggle = ({ user, perm, label }: { user: AdminUser; perm: "can_read" | "can_create" | "can_delete"; label: string }) => {
    const disabled = user.is_static || permSaving[user.id];
    const checked = user[perm];
    return (
      <label className={`perm-toggle ${disabled ? "perm-toggle-disabled" : ""}`} title={user.is_static ? "Static admin always has full access" : ""}>
        <input type="checkbox" checked={checked} disabled={disabled} onChange={() => !disabled && togglePerm(user, perm)} />
        <span>{label}</span>
      </label>
    );
  };

  return (
    <div className="page-container">
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 className="section-title" style={{ fontSize: "1.25rem" }}>Admin Panel</h1>
        <p style={{ margin: "0.3rem 0 0", fontSize: "0.875rem", color: "var(--text-muted)" }}>
          Manage user accounts and permissions
        </p>
      </div>

      {error && <div className="login-error" style={{ marginBottom: "1rem" }}>{error}</div>}

      <div className="card-modern" style={{ overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>Loading…</div>
        ) : (
          <table className="table-modern">
            <thead>
              <tr>
                <th>Username</th>
                <th>Role</th>
                <th style={{ textAlign: "center" }}>Read</th>
                <th style={{ textAlign: "center" }}>Create</th>
                <th style={{ textAlign: "center" }}>Delete</th>
                <th>Registered</th>
                <th style={{ width: "1%" }}></th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td style={{ fontWeight: 500 }}>
                    {user.username}
                    {user.id === currentUser?.id && (
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginLeft: "0.4rem" }}>(you)</span>
                    )}
                  </td>
                  <td>
                    {user.is_static
                      ? <span className="type-badge" style={{ background: "#fce7f3", color: "#9d174d" }}>Static Admin</span>
                      : user.is_admin
                        ? <span className="type-badge" style={{ background: "#fef3c7", color: "#92400e" }}>Admin</span>
                        : <span className="type-badge">User</span>
                    }
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <PermToggle user={user} perm="can_read" label="" />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <PermToggle user={user} perm="can_create" label="" />
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <PermToggle user={user} perm="can_delete" label="" />
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    {permError[user.id] && (
                      <span style={{ color: "var(--danger)", fontSize: "0.75rem", marginRight: "0.5rem" }}>
                        {permError[user.id]}
                      </span>
                    )}
                    <div style={{ display: "flex", gap: "0.4rem", justifyContent: "flex-end" }}>
                      {!user.is_static && (
                        <button
                          className="btn-back"
                          style={{ fontSize: "0.78rem", padding: "0.25rem 0.7rem", whiteSpace: "nowrap" }}
                          onClick={() => openReset(user)}
                        >
                          Reset PW
                        </button>
                      )}
                      {!user.is_static && user.id !== currentUser?.id && (
                        deleteConfirm === user.id ? (
                          <div className="delete-confirm">
                            <span>Delete?</span>
                            <button className="delete-yes" onClick={() => handleDelete(user.id)}>Yes</button>
                            <button className="delete-no" onClick={() => setDeleteConfirm(null)}>No</button>
                          </div>
                        ) : (
                          <button
                            className="btn-icon btn-icon-delete"
                            title="Delete user"
                            onClick={() => setDeleteConfirm(user.id)}
                          >
                            ✕
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Data Tools */}
      <div style={{ marginTop: "2rem" }}>
        <div style={{ marginBottom: "0.75rem" }}>
          <h2 className="section-title" style={{ fontSize: "1rem" }}>Data Tools</h2>
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.875rem", color: "var(--text-muted)" }}>
            Bulk operations on entry data
          </p>
        </div>
        <div className="card-modern" style={{ padding: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Remove dashes from asset IDs</div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                Strips all <code>-</code> characters from existing asset ID values (e.g. <code>ABC-123</code> → <code>ABC123</code>).
              </div>
              {stripResult && (
                <div style={{ marginTop: "0.5rem", fontSize: "0.82rem", color: "var(--success)", fontWeight: 500 }}>{stripResult}</div>
              )}
              {stripError && (
                <div style={{ marginTop: "0.5rem", fontSize: "0.82rem", color: "var(--danger)" }}>{stripError}</div>
              )}
            </div>
            <div style={{ flexShrink: 0 }}>
              {stripConfirm ? (
                <div className="delete-confirm">
                  <span>Are you sure?</span>
                  <button className="delete-yes" onClick={handleStripDashes} disabled={stripLoading}>
                    {stripLoading ? "Running…" : "Yes"}
                  </button>
                  <button className="delete-no" onClick={() => setStripConfirm(false)}>No</button>
                </div>
              ) : (
                <button className="btn-back" style={{ fontSize: "0.82rem", whiteSpace: "nowrap" }} onClick={() => setStripConfirm(true)}>
                  Strip Dashes
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reset password modal */}
      {resetTarget && (
        <div className="modal-overlay" onClick={() => setResetTarget(null)}>
          <div className="modal-box card-modern" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="section-title">Reset Password</h2>
              <button className="btn-icon" onClick={() => setResetTarget(null)}>✕</button>
            </div>
            {resetSuccess ? (
              <div className="modal-success">
                <div className="modal-success-icon">✓</div>
                <p>Password for <strong>{resetTarget.username}</strong> has been reset.</p>
                <button className="btn-add" style={{ width: "100%", justifyContent: "center" }} onClick={() => setResetTarget(null)}>
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="login-form">
                <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-muted)" }}>
                  Setting a new password for <strong>{resetTarget.username}</strong>.
                </p>
                <div className="login-field">
                  <label className="form-field-label" htmlFor="admin-new-pw">New Password</label>
                  <input id="admin-new-pw" type="password" className="form-control"
                    value={newPassword} onChange={e => setNewPassword(e.target.value)} autoFocus required />
                </div>
                <div className="login-field">
                  <label className="form-field-label" htmlFor="admin-confirm-pw">Confirm Password</label>
                  <input id="admin-confirm-pw" type="password" className="form-control"
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                </div>
                {resetError && <div className="login-error">{resetError}</div>}
                <div style={{ display: "flex", gap: "0.6rem" }}>
                  <button type="button" className="btn-back" style={{ flex: 1, justifyContent: "center" }} onClick={() => setResetTarget(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-add" style={{ flex: 1, justifyContent: "center" }} disabled={saving}>
                    {saving ? "Saving…" : "Set Password"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
