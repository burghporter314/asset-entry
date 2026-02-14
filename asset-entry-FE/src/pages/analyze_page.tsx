import React from "react";
import { Card, Table, Button } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";

interface TExpense {
  assetId: number;
  expenseAmount: number;
  expenseType: string;
  date: string;
}

interface LocationState {
  filteredData: TExpense[];
}

const AnalyzePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState;

  const filteredData = state?.filteredData || [];

  // Aggregate totals per asset
  const summary = filteredData.reduce(
    (acc: Record<number, { count: number; total: number }>, entry) => {
      if (!acc[entry.assetId]) acc[entry.assetId] = { count: 0, total: 0 };
      acc[entry.assetId].count += 1;
      acc[entry.assetId].total += entry.expenseAmount;
      return acc;
    },
    {}
  );

  const summaryRows = Object.entries(summary).map(([assetId, data]) => ({
    assetId,
    totalExpenses: data.count,
    totalAmount: data.total.toFixed(2),
  }));

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        padding: "2rem",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#f8f9fa",
      }}
    >
      <Card className="p-4 shadow" style={{ width: "600px" }}>
        <h4 className="mb-3">Expense Analysis</h4>
        <Table striped bordered hover responsive className="shadow-sm" style={{ backgroundColor: "#fff" }}>
          <thead className="table-dark">
            <tr>
              <th>Asset ID</th>
              <th>Total Expenses</th>
              <th>Total Amount ($)</th>
            </tr>
          </thead>
          <tbody>
            {summaryRows.length > 0 ? (
              summaryRows.map((row) => (
                <tr key={row.assetId}>
                  <td>{row.assetId}</td>
                  <td>{row.totalExpenses}</td>
                  <td>${row.totalAmount}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="text-center text-muted">
                  No entries to analyze
                </td>
              </tr>
            )}
          </tbody>
        </Table>

        <div className="d-grid mt-3">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Return
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AnalyzePage;
