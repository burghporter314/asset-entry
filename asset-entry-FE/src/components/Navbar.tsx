import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../Contexts/AuthContext";
import { useExpensesContext } from "../Contexts/ExpenseContext";
import ChangePasswordModal from "./ChangePasswordModal";

const Navbar: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { setData } = useExpensesContext();
  const [showChangePassword, setShowChangePassword] = useState(false);

  const isAddEntry = pathname === "/add-item";
  const canCreate = user?.isAdmin || user?.canCreate;
  const isStatic = user?.isStatic;

  const handleLogout = () => {
    setData([]);
    logout();
    navigate("/");
  };

  return (
    <>
      <nav className="app-navbar">
        <div className="app-navbar-brand">
          <span className="brand-dot">A</span>
          <span className="brand-name">AssetTracker</span>
        </div>

        <div style={{ flex: 1 }} />

        {user?.isAdmin && (
          <Link to="/admin" className={`nav-link ${pathname === "/admin" ? "active" : ""}`}>
            Admin
          </Link>
        )}

        {pathname !== "/admin" && (
          isAddEntry
            ? <Link to="/" className="btn-back">← Back to Entries</Link>
            : canCreate && <Link to="/add-item" className="btn-add">+ Add Entry</Link>
        )}

        <div className="navbar-user">
          {isStatic ? (
            <span className="navbar-username">{user?.username}</span>
          ) : (
            <button
              className="navbar-username btn-link"
              onClick={() => setShowChangePassword(true)}
              title="Change password"
            >
              {user?.username}
            </button>
          )}
          <button className="btn-logout" onClick={handleLogout}>Sign Out</button>
        </div>
      </nav>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </>
  );
};

export default Navbar;
