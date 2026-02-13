// src/pages/Expenses.tsx
import React, { createContext, useContext, useState } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useExpensesContext } from "../Contexts/ExpenseContext";
import { useNavigate } from "react-router-dom";

interface TExpense {
  assetId: number;
  expenseAmount: number;
  expenseType: string;
  date: string;
}

type SortKey = keyof TExpense;

const TableComponent: React.FC = () => {
    const {data, search, setSearch, sortKey, setSortKey, sortAsc, setSortAsc } = useExpensesContext();

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
        setSortAsc(!sortAsc);
        } else {
        setSortKey(key);
        setSortAsc(true);
        }
    };

    const filteredData = data
        .filter(
        (row) =>
            row.assetId.toString().includes(search.toLowerCase()) ||
            row.expenseType.toLowerCase().includes(search.toLowerCase()) ||
            row.date.includes(search) ||
            row.expenseAmount.toString().includes(search)
        )
        .sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];

        if (typeof aVal === "string" && typeof bVal === "string") {
            return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        } else {
            return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
        }
        });

    const getSortIndicator = (key: SortKey) => (sortKey === key ? (sortAsc ? " ▲" : " ▼") : "");
    const navigate = useNavigate();


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
        }}
        >
        <Form.Control
            type="text"
            placeholder="Search..."
            className="mb-3"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: "400px" }}
        />

        <div style={{ width: "60%", overflowX: "auto" }}>
            <Table
            striped
            bordered
            hover
            responsive
            className="shadow-sm"
            style={{ width: "100%", backgroundColor: "#fff" }}
            >
            <thead className="table-dark">
                <tr>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("assetId")}>
                    Asset ID {getSortIndicator("assetId")}
                </th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("expenseAmount")}>
                    Expense Amount {getSortIndicator("expenseAmount")}
                </th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("expenseType")}>
                    Expense Type {getSortIndicator("expenseType")}
                </th>
                <th style={{ cursor: "pointer" }} onClick={() => handleSort("date")}>
                    Date {getSortIndicator("date")}
                </th>
                <th style={{ cursor: "pointer" }}>
                    Download Receipt
                </th>
                </tr>
            </thead>
            <tbody>
                {filteredData.length > 0 ? (
                filteredData.map((row) => (
                    <tr key={row.assetId}>
                    <td><a href="">{row.assetId}</a></td>
                    <td>${row.expenseAmount.toFixed(2)}</td>
                    <td>{row.expenseType}</td>
                    <td>{row.date}</td>
                    <td></td>
                    </tr>
                ))
                ) : (
                <tr>
                    <td colSpan={4} className="text-center">
                    No results found
                    </td>
                </tr>
                )}
            </tbody>
            </Table>
        </div>
        <div style={{ position: "fixed", bottom: "10%", right: "8%" }}>
            <Button
                variant="outline-primary"
                style={{ marginRight: "10px" }} // space between buttons
            >
                Analysis
            </Button>

            <Button variant="outline-success" onClick={() => navigate("/add-item")}>
                Add Item
            </Button>
        </div>
    </div>
  );
};

export default TableComponent;
