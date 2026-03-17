import React, { useEffect } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import { Routes, Route } from "react-router-dom";
import TableComponent from "./pages/table";
import AddEntryComponent from "./pages/add_entry";
import AnalyzePage from "./pages/analyze_page";
import { ExpensesProvider, useExpensesContext } from "./Contexts/ExpenseContext";
import type { Expense } from "./Contexts/ExpenseContext";
import { getEntries } from "./services/entry_service";
import Navbar from "./components/Navbar";

const AppContent: React.FC = () => {
  const { setData } = useExpensesContext();

  useEffect(() => {
    const loadEntries = async () => {
      try {
        const data = await getEntries();
        const mappedData: Expense[] = data.map((item) => ({
          id: item.id,
          assetId: item.asset,
          expenseAmount: item.amount,
          expenseType: item.expense_type,
          date: item.date,
          fileName: item.file_name,
        }));
        setData(mappedData);
      } catch (error) {
        console.error("Error loading entries:", error);
      }
    };
    loadEntries();
  }, [setData]);

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<TableComponent />} />
        <Route path="/add-item" element={<AddEntryComponent />} />
        <Route path="/analyze" element={<AnalyzePage />} />
      </Routes>
    </>
  );
};

const App: React.FC = () => (
  <ExpensesProvider>
    <AppContent />
  </ExpensesProvider>
);

export default App;
