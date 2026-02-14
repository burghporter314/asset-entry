import React, { useState, useRef } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Form, Button, Row, Col, Card, InputGroup } from "react-bootstrap";
import AddAssetModal from "../external/modals/add_asset_id";
import AddExpenseTypeModal from "../external/modals/add_expense_type";
import { useNavigate } from "react-router-dom";
import { createEntry } from "../services/entry_service";
import { Alert } from "react-bootstrap";
import { useExpensesContext } from "../Contexts/ExpenseContext";

const AddEntryComponent: React.FC = () => {
  const [assetSearch, setAssetSearch] = useState("");
  const [expenseTypeSearch, setExpenseTypeSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showExpenseTypeModal, setShowExpenseTypeModal] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [date, setDate] = useState("");
  const [showAssetSuggestions, setShowAssetSuggestions] = useState(false);
  const [showExpenseSuggestions, setShowExpenseSuggestions] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null); // new ref
  const { data, setData } = useExpensesContext();

  const isFormValid =
  assetSearch &&
  expenseTypeSearch &&
  amount &&
  date &&
  file;

  const navigate = useNavigate();

  const handleAddAsset = (assetId: string) => {
    console.log("Added asset ID:", assetId);
  };

  const handleAddExpenseType = (expenseType: string) => {
    console.log("Added expense type:", expenseType);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await createEntry(
        assetSearch,
        expenseTypeSearch,
        amount,
        date,
        file
      );

      console.log("Success:", result);

      setData([...data, {
        id: result.id,
        assetId: assetSearch,
        expenseType: expenseTypeSearch,
        expenseAmount: parseFloat(amount),
        date,
        fileName: result.file_name,
      }]);

      setAssetSearch("");
      setExpenseTypeSearch("");
      setAmount("");
      setDate("");
      setFile(null);

        // Clear the file input field
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Show success popup
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const assets = Array.from(new Set(data.map((entry) => entry.assetId?.toString() || ""))).filter(Boolean);
  const expenseTypes = Array.from(new Set(data.map((entry) => entry.expenseType))).filter(Boolean);

  const filteredAssets = assets.filter(a =>
    a.toLowerCase().includes(assetSearch.toLowerCase())
  );

  const filteredExpenseTypes = expenseTypes.filter(u =>
    u.toLowerCase().includes(expenseTypeSearch.toLowerCase())
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        padding: "2rem",
        position: "relative",
        backgroundColor: "#f8f9fa",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <Card className="p-4 shadow" style={{ width: "420px" }}>
        {showSuccess && (
          <Alert
            variant="success"
            onClose={() => setShowSuccess(false)}
            dismissible
          >
            Expense entry added successfully!
          </Alert>
        )}
        <h3>Add Expense</h3>
        <hr></hr>
        <Form onSubmit={handleSubmit}>

            {/* Asset Search with Button */}
            <Form.Group className="mb-3 position-relative" style={{ maxWidth: "400px" }}>
            <InputGroup>
            <Form.Control
            type="search"
            placeholder="Enter asset id..."
            value={assetSearch}
            onFocus={() => setShowAssetSuggestions(true)}
            onBlur={() => setTimeout(() => setShowAssetSuggestions(false), 150)}
            onChange={(e) => setAssetSearch(e.target.value)}
            />
            </InputGroup>

            {/* Autocomplete dropdown */}
            {showAssetSuggestions && assetSearch.length > 0 && (
                <div
                style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    maxHeight: "150px",
                    overflowY: "auto",
                    background: "white",
                    border: "1px solid #ddd",
                    borderRadius: "0 0 4px 4px",
                    zIndex: 1000,
                }}
                >
                {filteredAssets.length > 0 ? (
                    filteredAssets.map((a, i) => (
                    <div
                        key={i}
                        style={{
                        padding: "8px",
                        cursor: "pointer",
                        borderBottom:
                            i < filteredAssets.length - 1 ? "1px solid #eee" : undefined,
                        }}
                        onClick={() => setAssetSearch(a)}
                    >
                        {a}
                    </div>
                    ))
                ) : (
                    <div style={{ padding: "8px", color: "#888" }}>No results</div>
                )}
                </div>
            )}
            </Form.Group>


            {/* Expense Type Search with Button */}
            <Form.Group className="mb-3 position-relative">
            <InputGroup>
                <Form.Control
                type="search"
                placeholder="Enter expense type..."
                value={expenseTypeSearch}
                onFocus={() => setShowExpenseSuggestions(true)}
                onBlur={() => setTimeout(() => setShowExpenseSuggestions(false), 150)}
                onChange={(e) => setExpenseTypeSearch(e.target.value)}
                />
            </InputGroup>

            {/* Optional dropdown suggestions */}
            {showExpenseSuggestions && expenseTypeSearch.length > 0 && (
                <div
                style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    maxHeight: "150px",
                    overflowY: "auto",
                    background: "white",
                    border: "1px solid #ddd",
                    borderRadius: "0 0 4px 4px",
                    zIndex: 1000,
                }}
                >
                {filteredExpenseTypes.length > 0 ? (
                    filteredExpenseTypes.map((u, i) => (
                    <div
                        key={i}
                        style={{
                        padding: "8px",
                        cursor: "pointer",
                        borderBottom: i < filteredExpenseTypes.length - 1 ? "1px solid #eee" : undefined,
                        }}
                        onClick={() => setExpenseTypeSearch(u)}
                    >
                        {u}
                    </div>
                    ))
                ) : (
                    <div style={{ padding: "8px", color: "#888" }}>No results</div>
                )}
                </div>
            )}
            </Form.Group>


          {/* Amount */}
          <Form.Group as={Row} className="mb-3">
            <Form.Label column sm={4}>
              Amount
            </Form.Label>
            <Col sm={8}>
              <InputGroup>
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^\d*\.?\d{0,2}$/.test(value)) {
                      setAmount(value);
                    }
                  }}
                />
              </InputGroup>
            </Col>
          </Form.Group>

          {/* Date */}
          <Form.Group as={Row} className="mb-3">
            <Form.Label column sm={4}>
              Date
            </Form.Label>
            <Col sm={8}>
                <Form.Control
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                />
            </Col>
          </Form.Group>

          <Form.Group as={Row} className="mb-3">
            <Form.Label column sm={4}>
                Receipt
            </Form.Label>
            <Col sm={8}>
                <Form.Control
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                    const selectedFile = e.target.files?.[0] || null;
                    setFile(selectedFile);
                }}
                />
            </Col>
          </Form.Group>

          <div className="d-grid">
            <Button type="submit" disabled={!isFormValid}>Submit</Button>
          </div>
          <hr></hr>
        <div className="d-grid mt-3">
            <Button variant="danger" onClick={() => navigate("/")}>
                Return
            </Button>
        </div>
        </Form>
      </Card>
    </div>
  );
};

export default AddEntryComponent;
