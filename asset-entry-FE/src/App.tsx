import React, { useEffect } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import { Routes, Route } from "react-router-dom";
import TableComponent from "./pages/table";
import AddEntryComponent from "./pages/add_entry";
import AnalyzePage from "./pages/analyze_page";
import AdminPage from "./pages/admin_page";
import LoginPage from "./pages/login_page";
import { ExpensesProvider, useExpensesContext } from "./Contexts/ExpenseContext";
import type { Expense } from "./Contexts/ExpenseContext";
import { AuthProvider, useAuth } from "./Contexts/AuthContext";
import { getEntries } from "./services/entry_service";
import Navbar from "./components/Navbar";

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const { setData } = useExpensesContext();

  useEffect(() => {
    if (!user || (!user.canRead && !user.isAdmin)) return;
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
  }, [user, setData]);

  if (!user) return <LoginPage />;

  const canRead = user.isAdmin || user.canRead;

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={
          canRead
            ? <TableComponent />
            : <NoAccessPage message="You don't have permission to view entries." />
        } />
        <Route path="/add-item" element={
          user.isAdmin || user.canCreate
            ? <AddEntryComponent />
            : <NoAccessPage message="You don't have permission to add entries." />
        } />
        <Route path="/analyze" element={
          canRead
            ? <AnalyzePage />
            : <NoAccessPage message="You don't have permission to view entries." />
        } />
        <Route path="/admin" element={
          user.isAdmin
            ? <AdminPage />
            : <NoAccessPage message="Admin access required." />
        } />
      </Routes>
    </>
  );
};

const NoAccessPage: React.FC<{ message: string }> = ({ message }) => (
  <div className="page-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
    <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
      <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🔒</div>
      <p style={{ fontSize: "0.95rem", margin: 0 }}>{message}</p>
    </div>
  </div>
);

const App: React.FC = () => (
  <AuthProvider>
    <ExpensesProvider>
      <AppContent />
    </ExpensesProvider>
  </AuthProvider>
);

export default App;
