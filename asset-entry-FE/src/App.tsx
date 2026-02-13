// App.tsx
import React, { createContext, useContext, useState, useEffect } from "react";

import 'bootstrap/dist/css/bootstrap.min.css';
import { Routes, Route } from "react-router-dom";
import TableComponent from "./pages/table";
import AddEntryComponent from "./pages/add_entry";
import { ExpensesProvider, useExpensesContext } from "./Contexts/ExpenseContext";
import type { Expense } from "./Contexts/ExpenseContext";

const AppContent: React.FC = () => {
  const { setData } = useExpensesContext();

  useEffect(() => {
    const expensesData: Expense[] = [
      { assetId: 1, expenseAmount: 120.5, expenseType: "Travel", date: "2026-02-01" },
      { assetId: 2, expenseAmount: 75, expenseType: "Food", date: "2026-02-05" },
      { assetId: 3, expenseAmount: 200, expenseType: "Equipment", date: "2026-02-10" },
      { assetId: 4, expenseAmount: 50, expenseType: "Travel", date: "2026-02-12" },
    ];
    setData(expensesData);
  }, [setData]);

  return (
    <Routes>
      <Route path="/" element={<TableComponent />} />
      <Route path="/add-item" element={<AddEntryComponent />} />
    </Routes>
  );
}

const App: React.FC = () => {

  return (
    <ExpensesProvider>
      <div style={{ padding: "20px", display: "flex", justifyContent: "center" }}>
        <AppContent />
      </div>
    </ExpensesProvider>
  );
};

export default App;
