// src/pages/Expenses.tsx
import React, { createContext, useContext, useState } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useExpensesContext } from "../Contexts/ExpenseContext";
import { useNavigate } from "react-router-dom";
import { getFile } from "../services/entry_service";

interface TExpense {
  assetId: number;
  expenseAmount: number;
  expenseType: string;
  date: string;
}

type SortKey = keyof TExpense;

const TableComponent: React.FC = () => {

    const {
        data, assetSearch, expenseSearch, startDate, endDate,
        sortKey, sortAsc, setSortAsc, setSortKey, setStartDate, setEndDate,
        setAssetSearch, setExpenseSearch
    } = useExpensesContext();

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
        setSortAsc(!sortAsc);
        } else {
        setSortKey(key);
        setSortAsc(true);
        }
    };

    const handleDownload = async (id: number, fileName: string) => {
        try {
            const blob = await getFile(id, fileName);

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "attachment";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Download failed:", err);
        }
    };

    const filteredData = data
    .filter((row) => {
        const matchesAsset = row.assetId.toLowerCase().includes(assetSearch.toLowerCase());
        const matchesExpense = row.expenseType.toLowerCase().includes(expenseSearch.toLowerCase());
        
        const rowDate = new Date(row.date);
        const afterStart = startDate ? rowDate >= new Date(startDate) : true;
        const beforeEnd = endDate ? rowDate <= new Date(endDate) : true;

        return matchesAsset && matchesExpense && afterStart && beforeEnd;
    })
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
        <div className="d-flex gap-2 mb-3">
        <Form.Control
            type="text"
            placeholder="Search asset..."
            value={assetSearch}
            onChange={(e) => setAssetSearch(e.target.value)}
            style={{ maxWidth: "200px" }}
        />
        <Form.Control
            type="text"
            placeholder="Search expense..."
            value={expenseSearch}
            onChange={(e) => setExpenseSearch(e.target.value)}
            style={{ maxWidth: "200px" }}
        />
        <Form.Control
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ maxWidth: "150px" }}
        />
        <Form.Control
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ maxWidth: "150px" }}
        />
        </div>



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
                <tr key={row.id}>
                    <td>{row.assetId}</td>
                    <td>${row.expenseAmount.toFixed(2)}</td>
                    <td>{row.expenseType}</td>
                    <td>{row.date}</td>
                    <td>
                    <a
                        href="#"
                        onClick={(e) => {
                        e.preventDefault();
                        handleDownload(row.id, row.fileName);
                        }}
                    >
                        Download
                    </a>
                    </td>
                </tr>
                ))
            ) : (
                <tr>
                <td colSpan={5} className="text-center">
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
            style={{ marginRight: "10px" }}
            onClick={() => navigate("/analyze", { state: { filteredData } })}
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
