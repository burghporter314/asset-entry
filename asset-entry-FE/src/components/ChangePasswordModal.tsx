import React, { useState, useEffect } from "react";
import { changePassword } from "../services/entry_service";

interface Props {
  onClose: () => void;
}

const ChangePasswordModal: React.FC<Props> = ({ onClose }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("New password must be different from the current one.");
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box card-modern" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="section-title">Change Password</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {success ? (
          <div className="modal-success">
            <div className="modal-success-icon">✓</div>
            <p>Password updated successfully.</p>
            <button className="btn-add" style={{ width: "100%" }} onClick={onClose}>Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label className="form-field-label" htmlFor="cp-current">Current Password</label>
              <input
                id="cp-current"
                type="password"
                className="form-control"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                autoFocus
                required
              />
            </div>

            <div className="login-field">
              <label className="form-field-label" htmlFor="cp-new">New Password</label>
              <input
                id="cp-new"
                type="password"
                className="form-control"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="login-field">
              <label className="form-field-label" htmlFor="cp-confirm">Confirm New Password</label>
              <input
                id="cp-confirm"
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {error && <div className="login-error">{error}</div>}

            <div style={{ display: "flex", gap: "0.6rem", marginTop: "0.25rem" }}>
              <button type="button" className="btn-back" style={{ flex: 1, justifyContent: "center" }} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-add" style={{ flex: 1, justifyContent: "center" }} disabled={loading}>
                {loading ? "Saving…" : "Update Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChangePasswordModal;
