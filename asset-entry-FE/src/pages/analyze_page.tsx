import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useExpensesContext } from "../Contexts/ExpenseContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];
const fmt = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const tooltipFmt = (v: unknown, label: string): [string, string] => [fmt(typeof v === "number" ? v : 0), label];

const AnalyzePage: React.FC = () => {
  const { data, assetSearch, expenseSearch, startDate, endDate } = useExpensesContext();

  // Apply the same filters as the table page
  const filteredData = useMemo(() => data.filter((row) => {
    const matchesAsset = row.assetId.toLowerCase().includes(assetSearch.toLowerCase());
    const matchesExpense = row.expenseType.toLowerCase().includes(expenseSearch.toLowerCase());
    const rowDate = new Date(row.date + "T00:00:00");
    const afterStart = startDate ? rowDate >= new Date(startDate + "T00:00:00") : true;
    const beforeEnd = endDate ? rowDate <= new Date(endDate + "T00:00:00") : true;
    return matchesAsset && matchesExpense && afterStart && beforeEnd;
  }), [data, assetSearch, expenseSearch, startDate, endDate]);

  // KPI values
  const totalAmount = filteredData.reduce((s, r) => s + r.expenseAmount, 0);
  const uniqueAssets = new Set(filteredData.map(r => r.assetId)).size;
  const avgAmount = filteredData.length > 0 ? totalAmount / filteredData.length : 0;
  const maxEntry = filteredData.reduce((m, r) => r.expenseAmount > m ? r.expenseAmount : m, 0);
  const typeCounts = filteredData.reduce((acc, r) => {
    acc[r.expenseType] = (acc[r.expenseType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  // Per-asset summary (bar chart + table)
  const assetSummary = useMemo(() => {
    const acc: Record<string, { count: number; total: number; max: number; min: number }> = {};
    filteredData.forEach(r => {
      if (!acc[r.assetId]) acc[r.assetId] = { count: 0, total: 0, max: -Infinity, min: Infinity };
      acc[r.assetId].count += 1;
      acc[r.assetId].total += r.expenseAmount;
      if (r.expenseAmount > acc[r.assetId].max) acc[r.assetId].max = r.expenseAmount;
      if (r.expenseAmount < acc[r.assetId].min) acc[r.assetId].min = r.expenseAmount;
    });
    return Object.entries(acc)
      .map(([assetId, d]) => ({
        assetId,
        count: d.count,
        total: parseFloat(d.total.toFixed(2)),
        avg: parseFloat((d.total / d.count).toFixed(2)),
        max: d.max === -Infinity ? 0 : d.max,
        min: d.min === Infinity ? 0 : d.min,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredData]);

  // Bar chart: top 10 assets
  const barData = assetSummary.slice(0, 10).map(d => ({ name: d.assetId, total: d.total }));

  // Pie chart: by expense type
  const typeMap: Record<string, number> = {};
  filteredData.forEach(r => { typeMap[r.expenseType] = (typeMap[r.expenseType] || 0) + r.expenseAmount; });
  const pieData = Object.entries(typeMap)
    .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Monthly trend
  const monthMap: Record<string, { month: string; total: number; count: number }> = {};
  filteredData.forEach(r => {
    const m = r.date.slice(0, 7);
    if (!monthMap[m]) monthMap[m] = { month: m, total: 0, count: 0 };
    monthMap[m].total += r.expenseAmount;
    monthMap[m].count += 1;
  });
  const areaData = Object.values(monthMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(d => ({ ...d, total: parseFloat(d.total.toFixed(2)) }));

  const hasFilters = assetSearch || expenseSearch || startDate || endDate;

  return (
    <div className="page-container">

      {/* Tab bar */}
      <div className="tab-bar">
        <Link to="/" className="tab-item">Entries</Link>
        <Link to="/analyze" className="tab-item active">Analysis</Link>
      </div>

      {hasFilters && (
        <div style={{ marginBottom: "1rem", padding: "0.6rem 1rem", background: "var(--primary-light)", border: "1px solid #bfdbfe", borderRadius: "8px", fontSize: "0.82rem", color: "var(--primary-dark)" }}>
          Showing analysis for filtered data — {filteredData.length} of {data.length} entries
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
        <div className="kpi-card">
          <div className="kpi-label">Total Spent</div>
          <div className="kpi-value" style={{ fontSize: "1.2rem" }}>{fmt(totalAmount)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Entries</div>
          <div className="kpi-value">{filteredData.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Assets</div>
          <div className="kpi-value">{uniqueAssets}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Avg per Entry</div>
          <div className="kpi-value" style={{ fontSize: "1.2rem" }}>{fmt(avgAmount)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Largest Entry</div>
          <div className="kpi-value" style={{ fontSize: "1.2rem" }}>{fmt(maxEntry)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Top Category</div>
          <div className="kpi-value" style={{ fontSize: "1rem", wordBreak: "break-word" }}>{topType}</div>
        </div>
      </div>

      {filteredData.length === 0 ? (
        <div className="card-modern" style={{ padding: "3.5rem", textAlign: "center", color: "var(--text-muted)" }}>
          No data to analyze. Add entries or adjust your filters on the Entries page.
        </div>
      ) : (
        <>
          {/* Charts */}
          <div className="charts-grid">

            {/* Bar: top assets */}
            {barData.length > 0 && (
              <div className="chart-card">
                <div className="chart-title">Top Assets by Total Spend</div>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={barData} margin={{ top: 4, right: 8, left: 8, bottom: 45 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} width={60} />
                    <Tooltip formatter={(v) => tooltipFmt(v, "Total")} />
                    <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Pie: by expense type */}
            {pieData.length > 0 && (
              <div className="chart-card">
                <div className="chart-title">Spend by Expense Type</div>
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%" cy="45%"
                      outerRadius={80}
                      innerRadius={36}
                    >
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => tooltipFmt(v, "Amount")} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: "0.78rem" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Area: monthly trend */}
            {areaData.length > 1 && (
              <div className="chart-card" style={{ gridColumn: "1 / -1" }}>
                <div className="chart-title">Monthly Spending Trend</div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={areaData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.18} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} width={60} />
                    <Tooltip formatter={(v) => tooltipFmt(v, "Total")} />
                    <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} fill="url(#colorTotal)" dot={{ r: 3 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Asset breakdown table */}
          <div className="card-modern" style={{ overflowX: "auto" }}>
            <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
              <span className="section-title">Asset Breakdown</span>
            </div>
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Asset ID</th>
                  <th>Entries</th>
                  <th>Total</th>
                  <th>Average</th>
                  <th>Min</th>
                  <th>Max</th>
                </tr>
              </thead>
              <tbody>
                {assetSummary.map(row => (
                  <tr key={row.assetId}>
                    <td style={{ fontWeight: 600 }}>{row.assetId}</td>
                    <td style={{ color: "var(--text-muted)" }}>{row.count}</td>
                    <td className="amount-cell">{fmt(row.total)}</td>
                    <td style={{ color: "var(--text-muted)" }}>{fmt(row.avg)}</td>
                    <td style={{ color: "var(--text-muted)" }}>{fmt(row.min)}</td>
                    <td style={{ color: "var(--text-muted)" }}>{fmt(row.max)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyzePage;
