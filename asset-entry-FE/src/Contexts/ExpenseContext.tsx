// src/context/ExpensesContext.tsx
import React, { createContext, useState, useContext } from "react";
import type { ReactNode } from "react";

export interface Expense {
  id: number;
  assetId: string;
  expenseAmount: number;
  expenseType: string;
  date: string;
  fileName: string | null;
}

interface ExpensesContextProps {
  data: Expense[];
  setData: React.Dispatch<React.SetStateAction<Expense[]>>;


  assetSearch: string;
  setAssetSearch: (value: string) => void;

  expenseSearch: string;
  setExpenseSearch: (value: string) => void;

  startDate: string;
  setStartDate: (value: string) => void;

  endDate: string;
  setEndDate: (value: string) => void;

  sortKey: keyof Expense;
  setSortKey: (key: keyof Expense) => void;
  sortAsc: boolean;
  setSortAsc: (asc: boolean) => void;
}

const ExpensesContext = createContext<ExpensesContextProps | undefined>(undefined);

export const useExpensesContext = () => {
  const context = useContext(ExpensesContext);
  if (!context) throw new Error("useExpensesContext must be used within ExpensesProvider");
  return context;
};

export const ExpensesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<Expense[]>([]);

  const [assetSearch, setAssetSearch] = useState("");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [sortKey, setSortKey] = useState<keyof Expense>("date");
  const [sortAsc, setSortAsc] = useState(false);

  return (
    <ExpensesContext.Provider
      value={{
        data, setData,
        assetSearch, setAssetSearch,
        expenseSearch, setExpenseSearch,
        startDate, setStartDate,
        endDate, setEndDate,
        sortKey, setSortKey,
        sortAsc, setSortAsc
      }}
    >
      {children}
    </ExpensesContext.Provider>
  );
};
