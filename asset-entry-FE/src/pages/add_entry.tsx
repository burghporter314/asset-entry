import React, { useState, useRef, useEffect, useCallback } from "react";
import { createEntry } from "../services/entry_service";
import { useExpensesContext } from "../Contexts/ExpenseContext";

const AddEntryComponent: React.FC = () => {
  const [assetSearch, setAssetSearch] = useState("");
  const [expenseTypeSearch, setExpenseTypeSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [showAssetSuggestions, setShowAssetSuggestions] = useState(false);
  const [showExpenseSuggestions, setShowExpenseSuggestions] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const assetInputRef = useRef<HTMLInputElement>(null);

  const { data, setData } = useExpensesContext();

  const isFormValid = !!(assetSearch.trim() && expenseTypeSearch.trim() && amount && date);

  const setToday = () => setDate(new Date().toISOString().slice(0, 10));

  // Use a ref so hold-to-repeat intervals always read the latest value
  const amountRef = useRef(amount);
  useEffect(() => { amountRef.current = amount; }, [amount]);

  const addToAmount = useCallback((delta: number) => {
    const next = Math.max(0, (parseFloat(amountRef.current) || 0) + delta);
    const str = next.toFixed(2);
    amountRef.current = str;
    setAmount(str);
  }, []);

  // Hold-to-repeat with acceleration
  const holdTimer = useRef<number | null>(null);
  const holdInterval = useRef<number | null>(null);
  const holdElapsed = useRef(0);

  const stopHold = useCallback(() => {
    if (holdTimer.current)    { clearTimeout(holdTimer.current);  holdTimer.current = null; }
    if (holdInterval.current) { clearInterval(holdInterval.current); holdInterval.current = null; }
  }, []);

  const startHold = useCallback((delta: number) => {
    stopHold(); // always clear any previous timers before starting
    addToAmount(delta);
    holdElapsed.current = 0;
    holdTimer.current = window.setTimeout(() => {
      holdInterval.current = window.setInterval(() => {
        holdElapsed.current += 80;
        const multiplier = holdElapsed.current > 2500 ? 20
                         : holdElapsed.current > 1200 ? 5
                         : 1;
        addToAmount(delta * multiplier);
      }, 80);
    }, 350);
  }, [addToAmount, stopHold]);

  // Clean up on unmount
  useEffect(() => stopHold, [stopHold]);

  const resetForm = () => {
    setAssetSearch("");
    setExpenseTypeSearch("");
    setAmount("");
    setDate("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await createEntry(assetSearch, expenseTypeSearch, amount, date, file);
      setData(prev => [...prev, {
        id: result.id,
        assetId: assetSearch.trim(),
        expenseType: expenseTypeSearch.trim(),
        expenseAmount: parseFloat(amount),
        date,
        fileName: result.file_name,
      }]);
      resetForm();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      assetInputRef.current?.focus();
    } catch (err) {
      console.error("Error:", err);
      setError("Failed to save entry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const assets = Array.from(new Set(data.map(e => e.assetId?.toString() || ""))).filter(Boolean);
  const expenseTypes = Array.from(new Set(data.map(e => e.expenseType))).filter(Boolean);
  const filteredAssets = assets.filter(a => a.toLowerCase().includes(assetSearch.toLowerCase()));
  const filteredExpenseTypes = expenseTypes.filter(u => u.toLowerCase().includes(expenseTypeSearch.toLowerCase()));

  const isDirty = !!(assetSearch || expenseTypeSearch || amount || date || file);

  return (
    <div className="page-container-narrow">
      <div className="card-modern" style={{ padding: "1.75rem" }}>

        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h4 style={{ fontWeight: 700, margin: 0 }}>New Expense Entry</h4>
        </div>

        {showSuccess && <div className="toast-success">Entry saved successfully!</div>}
        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "0.65rem 0.9rem", marginBottom: "1rem", fontSize: "0.875rem", color: "var(--danger)" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* Asset ID */}
          <div style={{ marginBottom: "0.9rem" }}>
            <label className="form-field-label">Asset ID</label>
            <div style={{ position: "relative" }}>
              <input
                ref={assetInputRef}
                className="form-control"
                type="search"
                placeholder="Enter or select asset ID…"
                value={assetSearch}
                autoComplete="off"
                onFocus={() => setShowAssetSuggestions(true)}
                onBlur={() => setTimeout(() => setShowAssetSuggestions(false), 150)}
                onChange={(e) => setAssetSearch(e.target.value)}
              />
              {showAssetSuggestions && assetSearch.length > 0 && (
                <div className="autocomplete-dropdown">
                  {filteredAssets.length > 0
                    ? filteredAssets.map((a, i) => (
                        <div key={i} className="autocomplete-item" onMouseDown={() => setAssetSearch(a)}>{a}</div>
                      ))
                    : <div className="autocomplete-empty">No match — will create new asset</div>
                  }
                </div>
              )}
            </div>
          </div>

          {/* Expense Type */}
          <div style={{ marginBottom: "0.9rem" }}>
            <label className="form-field-label">Expense type</label>
            <div style={{ position: "relative" }}>
              <input
                className="form-control"
                type="search"
                placeholder="Enter or select expense type…"
                value={expenseTypeSearch}
                autoComplete="off"
                onFocus={() => setShowExpenseSuggestions(true)}
                onBlur={() => setTimeout(() => setShowExpenseSuggestions(false), 150)}
                onChange={(e) => setExpenseTypeSearch(e.target.value)}
              />
              {showExpenseSuggestions && expenseTypeSearch.length > 0 && (
                <div className="autocomplete-dropdown">
                  {filteredExpenseTypes.length > 0
                    ? filteredExpenseTypes.map((u, i) => (
                        <div key={i} className="autocomplete-item" onMouseDown={() => setExpenseTypeSearch(u)}>{u}</div>
                      ))
                    : <div className="autocomplete-empty">No match — will create new type</div>
                  }
                </div>
              )}
            </div>
          </div>

          {/* Amount */}
          <div style={{ marginBottom: "0.9rem" }}>
            <label className="form-field-label">Amount</label>
            <div className="input-group">
              <span className="input-group-text">$</span>
              <input
                className="form-control"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^\d*\.?\d{0,2}$/.test(v)) setAmount(v);
                }}
              />
              {amount && (
                <button type="button" className="btn btn-outline-secondary" onClick={() => setAmount("")} title="Clear">
                  ✕
                </button>
              )}
            </div>
            <div className="stepper-row">
              <div className="stepper-group">
                <span className="stepper-label">¢</span>
                <button type="button" className="stepper-btn"
                  onPointerDown={() => startHold(-0.01)} onPointerUp={stopHold} onPointerLeave={stopHold}>−</button>
                <button type="button" className="stepper-btn"
                  onPointerDown={() => startHold(0.01)} onPointerUp={stopHold} onPointerLeave={stopHold}>+</button>
              </div>
              <div className="stepper-group">
                <span className="stepper-label">$</span>
                <button type="button" className="stepper-btn"
                  onPointerDown={() => startHold(-1)} onPointerUp={stopHold} onPointerLeave={stopHold}>−</button>
                <button type="button" className="stepper-btn"
                  onPointerDown={() => startHold(1)} onPointerUp={stopHold} onPointerLeave={stopHold}>+</button>
              </div>
            </div>
          </div>

          {/* Date */}
          <div style={{ marginBottom: "0.9rem" }}>
            <label className="form-field-label">Date</label>
            <div className="input-group">
              <input
                className="form-control"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <button type="button" className="btn btn-outline-secondary" onClick={setToday} style={{ whiteSpace: "nowrap", fontSize: "0.85rem" }}>
                Today
              </button>
            </div>
          </div>

          {/* Receipt */}
          <div style={{ marginBottom: "1.4rem" }}>
            <label className="form-field-label">Receipt <span style={{ fontWeight: 400 }}>(optional)</span></label>
            {file ? (
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", padding: "0.5rem 0.75rem", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "6px", fontSize: "0.875rem" }}>
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, padding: "0 0.2rem", flexShrink: 0 }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <input
                className="form-control"
                type="file"
                ref={fileInputRef}
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            )}
          </div>

          {/* Actions */}
          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={!isFormValid || isSubmitting}
            style={{ fontWeight: 600, padding: "0.6rem" }}
          >
            {isSubmitting ? "Saving…" : "Submit Entry"}
          </button>

          {isDirty && (
            <button
              type="button"
              onClick={resetForm}
              style={{ display: "block", width: "100%", marginTop: "0.6rem", background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.82rem", cursor: "pointer", padding: "0.2rem" }}
            >
              Clear form
            </button>
          )}

        </form>
      </div>
    </div>
  );
};

export default AddEntryComponent;
