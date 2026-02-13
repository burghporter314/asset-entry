// src/context/ExpensesContext.tsx
import React, { createContext, useState, useContext } from "react";
import type { ReactNode } from "react";

export interface Expense {
  assetId: number;
  expenseAmount: number;
  expenseType: string;
  date: string;
}

interface ExpensesContextProps {
  data: Expense[];
  setData: (data: Expense[]) => void;
  search: string;
  setSearch: (value: string) => void;
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
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof Expense>("assetId");
  const [sortAsc, setSortAsc] = useState(true);

  return (
    <ExpensesContext.Provider
      value={{ data, setData, search, setSearch, sortKey, setSortKey, sortAsc, setSortAsc }}
    >
      {children}
    </ExpensesContext.Provider>
  );
};
