// src/pages/Expenses.tsx
import React, { useState, useEffect } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useExpensesContext } from "../Contexts/ExpenseContext";
import { useNavigate } from "react-router-dom";
import { getFile, deleteEntry } from "../services/entry_service";

interface TExpense {
  id: number;
  assetId: string;
  expenseAmount: number;
  expenseType: string;
  date: string;
  fileName: string | null;
}

type SortKey = keyof TExpense;

const TableComponent: React.FC = () => {

    const {
        data, setData,
        assetSearch, expenseSearch, startDate, endDate,
        sortKey, sortAsc, setSortAsc, setSortKey,
        setAssetSearch, setExpenseSearch,
        setStartDate, setEndDate
    } = useExpensesContext();

    const navigate = useNavigate();

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [assetSearch, expenseSearch, startDate, endDate]);

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
            link.download = fileName || "attachment";
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error("Download failed:", err);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await deleteEntry(id);
            setData(prev => prev.filter(row => row.id !== id));
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    // Filter + sort
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

    // Pagination
    const totalPages = Math.ceil(filteredData.length / pageSize);
    const paginatedData = filteredData.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    const getSortIndicator = (key: SortKey) => (sortKey === key ? (sortAsc ? " ▲" : " ▼") : "");

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
            <h1>Asset Entry Program</h1>
            <br />

            <div className="d-flex flex-column gap-2">
                <div className="d-flex align-items-center">
                <Form.Label style={{ minWidth: "100px", flex: "0 0 auto" }}>Asset</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Search asset..."
                        value={assetSearch}
                        onChange={(e) => setAssetSearch(e.target.value)}
                        style={{ flex: "1 1 auto", minWidth: "120px" }}
                    />
                </div>

                <div className="d-flex align-items-center">
                    <Form.Label style={{ minWidth: "100px", flex: "0 0 auto" }}>Expense</Form.Label>
                    <Form.Control
                        type="text"
                        placeholder="Search expense..."
                        value={expenseSearch}
                        onChange={(e) => setExpenseSearch(e.target.value)}
                        style={{ flex: "1 1 auto", minWidth: "120px" }}
                    />
                </div>

                <div className="d-flex align-items-center">
                    <Form.Label style={{ minWidth: "100px", flex: "0 0 auto" }}>Start Date</Form.Label>
                    <Form.Control
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        style={{ flex: "1 1 auto", minWidth: "120px" }}
                    />
                </div>

                <div className="d-flex align-items-center">
                    <Form.Label style={{ minWidth: "100px", flex: "0 0 auto" }}>End Date</Form.Label>
                    <Form.Control
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        style={{ flex: "1 1 auto", minWidth: "120px" }}
                    />
                </div>

                <br />
                <div className="d-flex gap-2 flex-wrap">
                    <Button
                        variant="outline-primary"
                        onClick={() => navigate("/analyze", { state: { filteredData } })}
                    >
                        Analysis
                    </Button>
                    <br />
                    <Button variant="outline-success" onClick={() => navigate("/add-item")}>
                        Add Item
                    </Button>
                </div>
            </div>

            <br />

            <div style={{ width: "100%", overflowX: "auto" }}>
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
                            <th>Download Receipt</th>
                            <th>Remove Expense</th>
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.length > 0 ? (
                            paginatedData.map((row) => (
                                <tr key={row.id}>
                                    <td>{row.assetId}</td>
                                    <td>${row.expenseAmount.toFixed(2)}</td>
                                    <td>{row.expenseType}</td>
                                    <td>{row.date}</td>
                                    <td>
                                        {row.fileName ? (
                                            <a
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleDownload(row.id, row.fileName);
                                                }}
                                            >
                                                Download
                                            </a>
                                        ) : (
                                            ""
                                        )}
                                    </td>
                                    <td>
                                        <a
                                            href="#"
                                            style={{ color: "red" }}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (!window.confirm("Are you sure you want to delete this entry?")) return;
                                                handleDelete(row.id);
                                            }}
                                        >
                                            Remove
                                        </a>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="text-center">No results found</td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <div className="d-flex justify-content-center gap-2 mt-3">
                <Button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((prev) => prev - 1)}
                >
                    Previous
                </Button>

                <span className="align-self-center">
                    Page {currentPage} of {totalPages || 1}
                </span>

                <Button
                    disabled={currentPage === totalPages || totalPages === 0}
                    onClick={() => setCurrentPage((prev) => prev + 1)}
                >
                    Next
                </Button>
            </div>
        </div>
    );
};

export default TableComponent;
