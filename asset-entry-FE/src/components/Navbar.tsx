import React from "react";
import { Link, useLocation } from "react-router-dom";

const Navbar: React.FC = () => {
  const { pathname } = useLocation();
  const isAddEntry = pathname === "/add-item";

  return (
    <nav className="app-navbar">
      <div className="app-navbar-brand">
        <span className="brand-dot">A</span>
        <span className="brand-name">AssetTracker</span>
      </div>

      {isAddEntry ? (
        <Link to="/" className="btn-back">
          ← Back to Entries
        </Link>
      ) : (
        <Link to="/add-item" className="btn-add">
          + Add Entry
        </Link>
      )}
    </nav>
  );
};

export default Navbar;
