"use client";

import { useEffect, useState, useMemo, FormEvent } from "react";
import Link from "next/link";

export interface Employee {
  employee_id: number;
  name: string;
  email_id: string | null;
  phone_number: string | null;
  address: string | null;
  salary?: number | null;
}

const AVATAR_PALETTES = [
  { bg: "#ede9fe", color: "#6d28d9" },
  { bg: "#e0f2fe", color: "#0369a1" },
  { bg: "#dcfce7", color: "#15803d" },
  { bg: "#ffedd5", color: "#c2410c" },
  { bg: "#fce7f3", color: "#be185d" },
  { bg: "#ccfbf1", color: "#0f766e" },
  { bg: "#fef3c7", color: "#b45309" },
  { bg: "#fee2e2", color: "#b91c1c" },
];

function getPalette(name: string, id: number) {
  let hash = id;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "E";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none">
        <path d="M7 21.5 16 6l9 15.5H7Z" fill="currentColor" />
        <path d="m12.1 21.5 3.9-6.7 3.9 6.7h-7.8Z" fill="#fff" />
      </svg>
    </span>
  );
}

function NavIcon({ name }: { name: "overview" | "people" | "add" | "time" | "settings" }) {
  if (name === "add") {
    return (
      <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    );
  }
  const paths = {
    overview: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.5" /></>,
    people: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c.5-3 2.4-4.7 5.5-4.7s5 1.7 5.5 4.7M16 5.2a3.2 3.2 0 0 1 0 6.1m2 3.2c1.5.7 2.4 2.1 2.7 4.5" /></>,
    time: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.2 2" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1.8 1.8 0 0 0-3 .9v.2a1.8 1.8 0 0 1-3.6 0v-.2a1.8 1.8 0 0 0-3-.9l-.1.1a1.8 1.8 0 1 1-2.5-2.5l.1-.1a1.8 1.8 0 0 0-.9-3h-.2a1.8 1.8 0 0 1 0-3.6h.2a1.8 1.8 0 0 0 .9-3l-.1-.1a1.8 1.8 0 1 1 2.5-2.5l.1.1a1.8 1.8 0 0 0 3-.9v-.2a1.8 1.8 0 0 1 3.6 0v.2a1.8 1.8 0 0 0 3 .9l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1.8 1.8 0 0 0 .9 3h.2a1.8 1.8 0 0 1 0 3.6h-.2a1.8 1.8 0 0 0-.9 3Z" transform="translate(1 1) scale(.91)" /></>,
  };

  return (
    <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export default function EmployeesGridPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name-asc" | "name-desc">("newest");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [toast, setToast] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Edit Modal State
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [modalError, setModalError] = useState("");

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => {
      setToast(null);
    }, 2800);
  }

  async function fetchEmployees(isManualRefresh = false) {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setErrorMessage("");

    try {
      const response = await fetch("/api/employees", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Unable to retrieve records from database.");
      }
      const data = await response.json();
      setEmployees(Array.isArray(data.employees) ? data.employees : []);
      if (isManualRefresh) {
        showToast("Employee records refreshed from SQL Server");
      }
    } catch {
      setErrorMessage("Could not connect to SQL Server database. Please verify your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchEmployees();
  }, []);

  function openEditModal(emp: Employee) {
    setEditingEmployee(emp);
    setEditName(emp.name);
    setEditEmail(emp.email_id ?? "");
    setEditPhone(emp.phone_number ?? "");
    setEditAddress(emp.address ?? "");
    setModalError("");
  }

  function closeEditModal() {
    setEditingEmployee(null);
    setModalError("");
  }

  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingEmployee) return;

    setIsSavingEdit(true);
    setModalError("");

    try {
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: editingEmployee.employee_id,
          name: editName.trim(),
          email_id: editEmail.trim() || null,
          phone_number: editPhone.trim() || null,
          address: editAddress.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setModalError(data.error ?? "Failed to update employee.");
        return;
      }

      setEmployees((prev) =>
        prev.map((emp) =>
          emp.employee_id === editingEmployee.employee_id
            ? {
                ...emp,
                name: editName.trim(),
                email_id: editEmail.trim() || null,
                phone_number: editPhone.trim() || null,
                address: editAddress.trim() || null,
              }
            : emp
        )
      );

      closeEditModal();
      showToast(`Employee "${editName.trim()}" updated successfully!`);
    } catch {
      setModalError("Unable to connect to SQL Server. Check your connection.");
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function handleDelete(id: number, name: string) {
    const confirmed = window.confirm(`Are you sure you want to delete employee "${name}" (ID #${id})?`);
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/employees?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete record.");
      }
      setEmployees((prev) => prev.filter((emp) => emp.employee_id !== id));
      showToast(`Employee "${name}" deleted successfully`);
    } catch {
      alert("Failed to delete employee record from database.");
    } finally {
      setDeletingId(null);
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`);
  }

  // Filter & Sort
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let result = employees.filter((emp) => {
      if (!q) return true;
      const matchName = emp.name.toLowerCase().includes(q);
      const matchEmail = (emp.email_id ?? "").toLowerCase().includes(q);
      const matchPhone = (emp.phone_number ?? "").toLowerCase().includes(q);
      const matchAddress = (emp.address ?? "").toLowerCase().includes(q);
      const matchId = String(emp.employee_id).includes(q);
      return matchName || matchEmail || matchPhone || matchAddress || matchId;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "newest") return b.employee_id - a.employee_id;
      if (sortBy === "oldest") return a.employee_id - b.employee_id;
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      return 0;
    });

    return result;
  }, [employees, searchQuery, sortBy]);

  return (
    <div className="app-shell">
      {/* Toast Notification */}
      {toast && (
        <div className="toast-notice" role="alert">
          <span style={{ color: "#4ade80" }}>✓</span>
          <span>{toast}</span>
        </div>
      )}

      {/* Edit Modal Dialog */}
      {editingEmployee && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="edit-dialog-title">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 id="edit-dialog-title">Edit Employee #{editingEmployee.employee_id}</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={closeEditModal}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                {modalError && <div className="error-message">{modalError}</div>}

                <div className="field">
                  <label htmlFor="edit-name">
                    Full Name <span className="required-mark">*</span>
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    required
                    maxLength={100}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="edit-email">Email ID</label>
                  <input
                    id="edit-email"
                    type="email"
                    maxLength={150}
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="edit-phone">Phone Number</label>
                  <input
                    id="edit-phone"
                    type="tel"
                    maxLength={15}
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="edit-address">Address</label>
                  <textarea
                    id="edit-address"
                    rows={3}
                    maxLength={255}
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeEditModal}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={isSavingEdit}>
                  {isSavingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="sidebar">
        <Link className="brand" href="/" aria-label="People home">
          <BrandMark />
          <span>people<span className="brand-period">.</span></span>
        </Link>
        <div className="workspace-switcher">
          <div className="workspace-avatar">N</div>
          <div className="workspace-copy">
            <span className="eyebrow">WORKSPACE</span>
            <strong>Northstar Studio</strong>
          </div>
          <span className="chevron">⌄</span>
        </div>
        <span className="nav-label">MAIN NAVIGATION</span>
        <nav className="primary-nav" aria-label="Main navigation">
          <Link className="nav-link active" href="/employees">
            <NavIcon name="people" />
            <span>Employee Directory</span>
            <span className="nav-count">{employees.length}</span>
          </Link>
          <Link className="nav-link" href="/dashboard">
            <NavIcon name="overview" />
            <span>Employee Dashboard</span>
          </Link>
          <a className="nav-link" href="#">
            <NavIcon name="time" />
            <span>Time off</span>
          </a>
        </nav>
        <div className="sidebar-bottom">
          <a className="nav-link" href="#">
            <NavIcon name="settings" />
            <span>Settings</span>
          </a>
          <div className="profile-card">
            <div className="profile-avatar">SC</div>
            <div className="profile-copy">
              <strong>Sarah Chen</strong>
              <span>Administrator</span>
            </div>
            <span className="more">···</span>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <main className="main-area">
        {/* Topbar */}
        <header className="topbar">
          <div className="breadcrumb">
            <Link href="/" style={{ color: "#7b8492" }}>People</Link>
            <span className="breadcrumb-slash">/</span>
            <strong>Directory (Grid View)</strong>
          </div>
          <div className="heading-actions-wrap">
            <Link href="/" className="btn-primary" id="add-employee-top-btn">
              <span aria-hidden="true">+</span> Add Employee Form
            </Link>
            <button
              className={`btn-icon ${refreshing ? "spinning" : ""}`}
              onClick={() => fetchEmployees(true)}
              title="Refresh database records"
              aria-label="Refresh database records"
              disabled={refreshing}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19" />
              </svg>
            </button>
          </div>
        </header>

        {/* Content Container */}
        <div className="content content-wide">
          {/* Page Heading */}
          <div className="page-heading">
            <div>
              <Link href="/" className="back-link">
                <span aria-hidden="true">←</span> Back to Add Employee Form
              </Link>
              <h1>Employee Directory</h1>
              <p className="page-description">
                Showing live records fetched directly from the SQL Server database (<code>employee_db.dbo.Employee</code>).
              </p>
            </div>
            <div className="heading-actions-wrap">
              <Link href="/" className="btn-secondary">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                + Add Employee Form
              </Link>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="stats-bar">
            <div className="stat-pill db-status">
              <span className="status-dot" aria-hidden="true" />
              <span>SQL Server Connected</span>
            </div>
            <div className="stat-pill">
              <span>Total Employees:</span>
              <strong>{employees.length}</strong>
            </div>
            {searchQuery && (
              <div className="stat-pill">
                <span>Filtered Matches:</span>
                <strong>{filteredEmployees.length}</strong>
              </div>
            )}
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="error-message" role="alert" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>{errorMessage}</span>
              <button
                className="btn-secondary"
                style={{ height: "30px", minHeight: "auto", padding: "0 10px", fontSize: "11px" }}
                onClick={() => fetchEmployees(true)}
              >
                Retry
              </button>
            </div>
          )}

          {/* Filter & Search Toolbar */}
          <div className="filter-toolbar">
            <div className="search-box-wrap">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Search by name, email, phone, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                id="search-employees-input"
              />
              {searchQuery && (
                <button
                  className="search-clear-btn"
                  onClick={() => setSearchQuery("")}
                  title="Clear search"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="toolbar-controls">
              <div className="sort-group">
                <label htmlFor="sort-select">Sort by:</label>
                <select
                  id="sort-select"
                  className="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name-asc">Name (A → Z)</option>
                  <option value="name-desc">Name (Z → A)</option>
                </select>
              </div>

              {/* View mode toggle */}
              <div className="view-switcher" role="group" aria-label="View mode">
                <button
                  className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
                  onClick={() => setViewMode("grid")}
                  aria-label="Card Grid View"
                  title="Card Grid View"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  </svg>
                  <span>Grid</span>
                </button>
                <button
                  className={`view-btn ${viewMode === "table" ? "active" : ""}`}
                  onClick={() => setViewMode("table")}
                  aria-label="Table View"
                  title="Table View"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                  <span>Table</span>
                </button>
              </div>
            </div>
          </div>

          {/* Loading Skeleton */}
          {loading && (
            <div className="skeleton-grid">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="skeleton-card">
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <div style={{ width: "46px", height: "46px", borderRadius: "12px", background: "#edf0f5" }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
                      <div className="skeleton-line" style={{ width: "60%" }} />
                      <div className="skeleton-line" style={{ width: "35%", height: "12px" }} />
                    </div>
                  </div>
                  <div style={{ borderTop: "1px solid #edf0f5", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                    <div className="skeleton-line" style={{ width: "90%" }} />
                    <div className="skeleton-line" style={{ width: "70%" }} />
                    <div className="skeleton-line" style={{ width: "80%" }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State (No records in DB) */}
          {!loading && employees.length === 0 && !errorMessage && (
            <div className="empty-state">
              <div className="empty-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21v-1a7 7 0 0 1 14 0v1" />
                  <line x1="19" y1="11" x2="19" y2="17" />
                  <line x1="22" y1="14" x2="16" y2="14" />
                </svg>
              </div>
              <h3>No Employees Found</h3>
              <p>There are no employee records saved in the SQL database yet. Fill out the form to add your first employee.</p>
              <Link href="/" className="btn-primary">
                + Add First Employee
              </Link>
            </div>
          )}

          {/* Empty Search State */}
          {!loading && employees.length > 0 && filteredEmployees.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon-wrap" style={{ background: "#fef3c7", color: "#b45309" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </div>
              <h3>No Matches Found</h3>
              <p>No employees match &ldquo;{searchQuery}&rdquo;. Try adjusting your keywords or clearing the filter.</p>
              <button className="btn-secondary" onClick={() => setSearchQuery("")}>
                Clear Search Filter
              </button>
            </div>
          )}

          {/* CARD GRID VIEW */}
          {!loading && filteredEmployees.length > 0 && viewMode === "grid" && (
            <div className="employee-grid" id="employee-card-grid">
              {filteredEmployees.map((emp) => {
                const palette = getPalette(emp.name, emp.employee_id);
                const initials = getInitials(emp.name);

                return (
                  <article key={emp.employee_id} className="employee-card" id={`employee-card-${emp.employee_id}`}>
                    <div
                      className="employee-card-banner"
                      style={{
                        background: `linear-gradient(90deg, ${palette.color}, #7057d9, #c4b5fd)`,
                      }}
                    />
                    <div className="employee-card-body">
                      {/* Top Row: Avatar, Name & ID */}
                      <div className="card-header-row">
                        <div className="avatar-name-wrap">
                          <div
                            className="card-avatar"
                            style={{
                              backgroundColor: palette.bg,
                              color: palette.color,
                            }}
                          >
                            {initials}
                          </div>
                          <div className="emp-details-wrap">
                            <h3 className="emp-name" title={emp.name}>
                              {emp.name}
                            </h3>
                            <div className="emp-role-tag">Team Member</div>
                          </div>
                        </div>
                        <span className="emp-id-pill" title="Employee Database ID">
                          #{emp.employee_id}
                        </span>
                      </div>

                      {/* Contact Details List */}
                      <div className="contact-info-list">
                        {/* Email */}
                        <div className="contact-row">
                          <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                            <polyline points="22,6 12,13 2,6" />
                          </svg>
                          {emp.email_id ? (
                            <a href={`mailto:${emp.email_id}`} title={`Send email to ${emp.email_id}`}>
                              {emp.email_id}
                            </a>
                          ) : (
                            <span className="contact-placeholder">No email provided</span>
                          )}
                        </div>

                        {/* Phone */}
                        <div className="contact-row">
                          <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                          {emp.phone_number ? (
                            <a href={`tel:${emp.phone_number}`} title={`Call ${emp.phone_number}`}>
                              {emp.phone_number}
                            </a>
                          ) : (
                            <span className="contact-placeholder">No phone provided</span>
                          )}
                        </div>

                        {/* Address */}
                        <div className="contact-row">
                          <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          {emp.address ? (
                            <span>{emp.address}</span>
                          ) : (
                            <span className="contact-placeholder">No address provided</span>
                          )}
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="card-footer-row">
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            className="edit-btn"
                            onClick={() => openEditModal(emp)}
                            title="Edit employee record"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            className="copy-btn"
                            onClick={() => {
                              const details = `Employee: ${emp.name} (ID #${emp.employee_id})\nEmail: ${emp.email_id || "N/A"}\nPhone: ${emp.phone_number || "N/A"}\nAddress: ${emp.address || "N/A"}`;
                              copyToClipboard(details, `${emp.name}'s info`);
                            }}
                            title="Copy employee contact info"
                          >
                            Copy
                          </button>
                        </div>

                        <button
                          type="button"
                          className="delete-btn"
                          onClick={() => handleDelete(emp.employee_id, emp.name)}
                          title={`Delete ${emp.name} from database`}
                          aria-label={`Delete ${emp.name}`}
                          disabled={deletingId === emp.employee_id}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* TABLE VIEW */}
          {!loading && filteredEmployees.length > 0 && viewMode === "table" && (
            <div className="table-card">
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: "70px" }}>ID</th>
                      <th>Employee</th>
                      <th>Email Address</th>
                      <th>Phone Number</th>
                      <th>Address</th>
                      <th style={{ textAlign: "right", width: "160px" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((emp) => {
                      const palette = getPalette(emp.name, emp.employee_id);
                      const initials = getInitials(emp.name);

                      return (
                        <tr key={emp.employee_id}>
                          <td>
                            <span className="emp-id-pill">#{emp.employee_id}</span>
                          </td>
                          <td>
                            <div className="table-avatar-cell">
                              <div
                                className="table-avatar"
                                style={{ backgroundColor: palette.bg, color: palette.color }}
                              >
                                {initials}
                              </div>
                              <strong>{emp.name}</strong>
                            </div>
                          </td>
                          <td>
                            {emp.email_id ? (
                              <a href={`mailto:${emp.email_id}`}>{emp.email_id}</a>
                            ) : (
                              <span className="contact-placeholder">—</span>
                            )}
                          </td>
                          <td>
                            {emp.phone_number ? (
                              <a href={`tel:${emp.phone_number}`}>{emp.phone_number}</a>
                            ) : (
                              <span className="contact-placeholder">—</span>
                            )}
                          </td>
                          <td>
                            {emp.address ? (
                              <span>{emp.address}</span>
                            ) : (
                              <span className="contact-placeholder">—</span>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "6px" }}>
                              <button
                                type="button"
                                className="edit-btn"
                                onClick={() => openEditModal(emp)}
                                title="Edit employee record"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="copy-btn"
                                onClick={() => {
                                  const text = `${emp.name} | ${emp.email_id || ""} | ${emp.phone_number || ""}`;
                                  copyToClipboard(text, `${emp.name}'s info`);
                                }}
                                title="Copy contact info"
                              >
                                Copy
                              </button>
                              <button
                                type="button"
                                className="delete-btn"
                                onClick={() => handleDelete(emp.employee_id, emp.name)}
                                title="Delete record"
                                disabled={deletingId === emp.employee_id}
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <footer className="page-footer">
            People <span>·</span> Making work, work better. Connected to SQL Server <code>employee_db.dbo.Employee</code>.
          </footer>
        </div>
      </main>
    </div>
  );
}
