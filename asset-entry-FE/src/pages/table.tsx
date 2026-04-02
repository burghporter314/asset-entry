import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useExpensesContext } from "../Contexts/ExpenseContext";
import { useAuth } from "../Contexts/AuthContext";
import { getFile, deleteEntry, updateEntry } from "../services/entry_service";
import type { Expense } from "../Contexts/ExpenseContext";

type SortKey = keyof Expense;

const TableComponent: React.FC = () => {
  const { user } = useAuth();
  const canDelete = user?.isAdmin || user?.canDelete;
  const {
    data, setData,
    assetSearch, expenseSearch, startDate, endDate,
    sortKey, sortAsc, setSortAsc, setSortKey,
    setAssetSearch, setExpenseSearch,
    setStartDate, setEndDate,
  } = useExpensesContext();

  const [currentPage, setCurrentPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const pageSize = 15;

  // Edit state
  const [editEntry, setEditEntry] = useState<Expense | null>(null);
  const [editAsset, setEditAsset] = useState("");
  const [editExpenseType, setEditExpenseType] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);
  const [editClearFile, setEditClearFile] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setCurrentPage(1); }, [assetSearch, expenseSearch, startDate, endDate]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  };

  const handleDownload = async (id: number, fileName: string) => {
    try { await getFile(id, fileName); }
    catch (err) { console.error("Download failed:", err); }
  };

  const openEdit = (row: Expense) => {
    setEditEntry(row);
    setEditAsset(row.assetId);
    setEditExpenseType(row.expenseType);
    setEditAmount(row.expenseAmount.toFixed(2));
    setEditDate(row.date);
    setEditFile(null);
    setEditClearFile(false);
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEntry || editSaving) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const result = await updateEntry(
        editEntry.id, editAsset, editExpenseType, editAmount, editDate, editFile, editClearFile
      );
      setData(prev => prev.map(r => r.id === editEntry.id ? {
        ...r,
        assetId: result.asset,
        expenseType: result.expense_type,
        expenseAmount: parseFloat(result.amount),
        date: result.date,
        fileName: result.file_name,
      } : r));
      setEditEntry(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteEntry(id);
      setData(prev => prev.filter(row => row.id !== id));
      setDeleteConfirm(null);
    } catch (err) { console.error("Delete failed:", err); }
  };

  const hasFilters = assetSearch || expenseSearch || startDate || endDate;
  const clearFilters = () => {
    setAssetSearch(""); setExpenseSearch(""); setStartDate(""); setEndDate("");
  };

  const filteredData = data
    .filter((row) => {
      const matchesAsset = row.assetId.toLowerCase().includes(assetSearch.toLowerCase());
      const matchesExpense = row.expenseType.toLowerCase().includes(expenseSearch.toLowerCase());
      const rowDate = new Date(row.date + "T00:00:00");
      const afterStart = startDate ? rowDate >= new Date(startDate + "T00:00:00") : true;
      const beforeEnd = endDate ? rowDate <= new Date(endDate + "T00:00:00") : true;
      return matchesAsset && matchesExpense && afterStart && beforeEnd;
    })
    .sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null || bVal == null) return 0;
      if (typeof aVal === "string" && typeof bVal === "string")
        return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const sortIcon = (key: SortKey) => sortKey === key ? (sortAsc ? " ▲" : " ▼") : "";
  const formatDate = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return `${m}-${d}-${y}`;
  };

  // KPI stats
  const totalAmount = filteredData.reduce((s, r) => s + r.expenseAmount, 0);
  const uniqueAssets = new Set(filteredData.map(r => r.assetId)).size;
  const avgAmount = filteredData.length > 0 ? totalAmount / filteredData.length : 0;
  const fmt = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <>
    <div className="page-container">

      {/* Tab bar */}
      <div className="tab-bar">
        <Link to="/" className="tab-item active">Entries</Link>
        <Link to="/analyze" className="tab-item">Analysis</Link>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Entries</div>
          <div className="kpi-value">{filteredData.length}</div>
          {hasFilters && <div className="kpi-sub">of {data.length} total</div>}
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total Amount</div>
          <div className="kpi-value" style={{ fontSize: "1.25rem" }}>${fmt(totalAmount)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Unique Assets</div>
          <div className="kpi-value">{uniqueAssets}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg per Entry</div>
          <div className="kpi-value" style={{ fontSize: "1.25rem" }}>${fmt(avgAmount)}</div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="filter-panel">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Filters
          </span>
          {hasFilters && (
            <button
              onClick={clearFilters}
              style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.82rem", cursor: "pointer", fontWeight: 500, padding: 0 }}
            >
              Clear all
            </button>
          )}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))", gap: "0.75rem" }}>
          <div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Asset ID</div>
            <input
              className="form-control form-control-sm"
              type="text"
              placeholder="Search asset ID..."
              value={assetSearch}
              onChange={(e) => setAssetSearch(e.target.value)}
            />
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Expense Type</div>
            <input
              className="form-control form-control-sm"
              type="text"
              placeholder="Search expense type..."
              value={expenseSearch}
              onChange={(e) => setExpenseSearch(e.target.value)}
            />
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>From</div>
            <input className="form-control form-control-sm" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "0.25rem" }}>To</div>
            <input className="form-control form-control-sm" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card-modern" style={{ overflowX: "auto" }}>
        <table className="table-modern">
          <thead>
            <tr>
              <th style={{ cursor: "pointer" }} onClick={() => handleSort("assetId")}>Asset ID{sortIcon("assetId")}</th>
              <th style={{ cursor: "pointer" }} onClick={() => handleSort("expenseAmount")}>Amount{sortIcon("expenseAmount")}</th>
              <th style={{ cursor: "pointer" }} onClick={() => handleSort("expenseType")}>Type{sortIcon("expenseType")}</th>
              <th style={{ cursor: "pointer" }} onClick={() => handleSort("date")}>Date{sortIcon("date")}</th>
              <th>Receipt</th>
              <th style={{ width: "80px" }}></th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row) => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 600 }}>{row.assetId}</td>
                  <td className="amount-cell">${row.expenseAmount.toFixed(2)}</td>
                  <td><span className="type-badge">{row.expenseType}</span></td>
                  <td style={{ color: "var(--text-muted)" }}>{formatDate(row.date)}</td>
                  <td>
                    {row.fileName ? (
                      <button
                        className="btn-receipt"
                        onClick={() => handleDownload(row.id, row.fileName!)}
                      >
                        Download Receipt
                      </button>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  <td>
                    {deleteConfirm === row.id ? (
                      <div className="delete-confirm">
                        <span>Delete entry?</span>
                        <button className="delete-yes" onClick={() => handleDelete(row.id)}>Yes</button>
                        <button className="delete-no" onClick={() => setDeleteConfirm(null)}>No</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: "0.25rem", justifyContent: "flex-end" }}>
                        {(user?.isAdmin || user?.canCreate) && (
                          <button className="btn-icon btn-icon-edit" title="Edit entry" onClick={() => openEdit(row)}>
                            ✎
                          </button>
                        )}
                        {canDelete && (
                          <button className="btn-icon btn-icon-delete" title="Delete entry" onClick={() => setDeleteConfirm(row.id)}>
                            ✕
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "3rem 1rem" }}>
                  {data.length === 0 ? "No entries yet — add your first one!" : "No results match your filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination-bar">
          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            ← Prev
          </button>
          <span className="pagination-info">Page {currentPage} of {totalPages}</span>
          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </div>

    {/* Edit modal */}
    {editEntry && (
      <div className="modal-overlay" onClick={() => !editSaving && setEditEntry(null)}>
        <div className="modal-box card-modern" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="section-title">Edit Entry</h2>
            <button className="btn-icon" onClick={() => !editSaving && setEditEntry(null)}>✕</button>
          </div>
          <form onSubmit={handleEditSubmit} className="login-form">

            <div className="login-field">
              <label className="form-field-label">Asset ID</label>
              <input
                className="form-control"
                type="text"
                value={editAsset}
                onChange={e => setEditAsset(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase())}
                required
              />
            </div>

            <div className="login-field">
              <label className="form-field-label">Expense Type</label>
              <input
                className="form-control"
                type="text"
                value={editExpenseType}
                onChange={e => setEditExpenseType(e.target.value)}
                required
              />
            </div>

            <div className="login-field">
              <label className="form-field-label">Amount</label>
              <div className="input-group">
                <span className="input-group-text">$</span>
                <input
                  className="form-control"
                  type="text"
                  inputMode="decimal"
                  value={editAmount}
                  onChange={e => { if (/^\d*\.?\d{0,2}$/.test(e.target.value)) setEditAmount(e.target.value); }}
                  required
                />
              </div>
            </div>

            <div className="login-field">
              <label className="form-field-label">Date</label>
              <input
                className="form-control"
                type="date"
                value={editDate}
                onChange={e => setEditDate(e.target.value)}
                required
              />
            </div>

            <div className="login-field">
              <label className="form-field-label">Receipt</label>
              {editFile ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem 0.75rem", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.875rem" }}>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{editFile.name}</span>
                  <button type="button" onClick={() => { setEditFile(null); if (editFileRef.current) editFileRef.current.value = ""; }}
                    style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, padding: "0 0.2rem" }}>
                    Remove
                  </button>
                </div>
              ) : editClearFile ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.875rem", color: "var(--text-muted)" }}>
                  <span>No receipt</span>
                  <button type="button" onClick={() => setEditClearFile(false)}
                    style={{ background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: "0.82rem", fontWeight: 500 }}>
                    Undo
                  </button>
                </div>
              ) : editEntry.fileName ? (
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem 0.75rem", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.875rem" }}>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--text-muted)" }}>
                    Current receipt attached
                  </span>
                  <button type="button" onClick={() => setEditClearFile(true)}
                    style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, padding: "0 0.2rem", flexShrink: 0 }}>
                    Remove
                  </button>
                </div>
              ) : (
                <input className="form-control" type="file" ref={editFileRef}
                  onChange={e => setEditFile(e.target.files?.[0] || null)} />
              )}
              {!editFile && !editClearFile && editEntry.fileName && (
                <div style={{ marginTop: "0.35rem" }}>
                  <input className="form-control" type="file" ref={editFileRef}
                    onChange={e => { if (e.target.files?.[0]) setEditFile(e.target.files[0]); }}
                    style={{ fontSize: "0.82rem" }} />
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>Upload to replace current receipt</div>
                </div>
              )}
            </div>

            {editError && <div className="login-error">{editError}</div>}

            <div style={{ display: "flex", gap: "0.6rem" }}>
              <button type="button" className="btn-back" style={{ flex: 1, justifyContent: "center" }}
                onClick={() => !editSaving && setEditEntry(null)}>
                Cancel
              </button>
              <button type="submit" className="btn-add" style={{ flex: 1, justifyContent: "center" }} disabled={editSaving}>
                {editSaving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
};

export default TableComponent;
