"use client";

import { useEffect, useState, useMemo, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export interface Employee {
  employee_id: number;
  name: string;
  email_id: string | null;
  phone_number: string | null;
  address: string | null;
  salary: number | null;
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

function formatSalary(salary: number | null) {
  if (salary === null || salary === undefined || isNaN(Number(salary))) {
    return "Not specified";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(salary));
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

export default function EmployeeDashboard() {
  const router = useRouter();

  const [adminUser, setAdminUser] = useState<string>("admin");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [toast, setToast] = useState<string | null>(null);

  // View & Filter State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"salary-desc" | "salary-asc" | "name-asc" | "newest" | "oldest">("newest");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Add Employee Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [addName, setAddName] = useState("");
  const [addSalary, setAddSalary] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addAddress, setAddAddress] = useState("");
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [addError, setAddError] = useState("");

  // Edit Employee Modal State (for updating salary and name)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [editName, setEditName] = useState("");
  const [editSalary, setEditSalary] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const [deletingId, setDeletingId] = useState<number | null>(null);

  function showToastMessage(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  // Verify Auth on mount
  useEffect(() => {
    async function verifyAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (data.authenticated) {
          setAdminUser(data.user?.username || "admin");
        } else {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      }
    }

    verifyAuth();
    loadEmployees();
  }, [router]);

  // Load Employees from SQL Server
  async function loadEmployees(isManual = false) {
    if (isManual) setRefreshing(true);
    else setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/employees", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load employee records.");
      }
      const data = await response.json();
      setEmployees(Array.isArray(data.employees) ? data.employees : []);
      if (isManual) {
        showToastMessage("Data reloaded from SQL Server");
      }
    } catch {
      setErrorMessage("Could not connect to SQL Server database. Please ensure the server is active.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Handle Logout
  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  // Open Edit Modal with Employee details (especially Name and Salary)
  function handleOpenEdit(emp: Employee) {
    setEditingEmployee(emp);
    setEditName(emp.name);
    setEditSalary(emp.salary !== null && emp.salary !== undefined ? String(emp.salary) : "");
    setEditEmail(emp.email_id || "");
    setEditPhone(emp.phone_number || "");
    setEditAddress(emp.address || "");
    setEditError("");
  }

  // Save Edit (PUT request)
  async function handleSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingEmployee) return;

    if (!editName.trim()) {
      setEditError("Employee name is required.");
      return;
    }

    setIsSubmittingEdit(true);
    setEditError("");

    try {
      const res = await fetch("/api/employees", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: editingEmployee.employee_id,
          name: editName.trim(),
          salary: editSalary ? Number(editSalary) : null,
          email_id: editEmail.trim() || null,
          phone_number: editPhone.trim() || null,
          address: editAddress.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Failed to update employee details.");
        return;
      }

      showToastMessage(`Updated ${editName.trim()}'s details (Salary & Profile)`);
      setEditingEmployee(null);
      loadEmployees();
    } catch {
      setEditError("Server connection error. Please try again.");
    } finally {
      setIsSubmittingEdit(false);
    }
  }

  // Save New Employee (POST request)
  async function handleSaveAdd(e: FormEvent) {
    e.preventDefault();

    if (!addName.trim()) {
      setAddError("Employee name is required.");
      return;
    }

    setIsSubmittingAdd(true);
    setAddError("");

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          salary: addSalary ? Number(addSalary) : null,
          email_id: addEmail.trim() || null,
          phone_number: addPhone.trim() || null,
          address: addAddress.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Failed to add employee.");
        return;
      }

      showToastMessage(`New employee "${addName.trim()}" added to database!`);
      // Reset form
      setAddName("");
      setAddSalary("");
      setAddEmail("");
      setAddPhone("");
      setAddAddress("");
      setShowAddModal(false);
      loadEmployees();
    } catch {
      setAddError("Failed to reach SQL Server database.");
    } finally {
      setIsSubmittingAdd(false);
    }
  }

  // Delete Employee (DELETE request)
  async function handleDelete(id: number, name: string) {
    const confirmed = window.confirm(`Are you sure you want to delete employee "${name}" (ID #${id}) from SQL Server?`);
    if (!confirmed) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/employees?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Delete failed.");
      }
      setEmployees((prev) => prev.filter((e) => e.employee_id !== id));
      showToastMessage(`Employee "${name}" deleted.`);
    } catch {
      alert("Failed to delete employee from database.");
    } finally {
      setDeletingId(null);
    }
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
      const matchSalary = emp.salary !== null ? String(emp.salary).includes(q) : false;
      return matchName || matchEmail || matchPhone || matchAddress || matchId || matchSalary;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === "salary-desc") return (b.salary || 0) - (a.salary || 0);
      if (sortBy === "salary-asc") return (a.salary || 0) - (b.salary || 0);
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "oldest") return a.employee_id - b.employee_id;
      return b.employee_id - a.employee_id; // "newest"
    });

    return result;
  }, [employees, searchQuery, sortBy]);

  // Compute KPI Stats
  const stats = useMemo(() => {
    const total = employees.length;
    const withSalary = employees.filter((e) => e.salary !== null && e.salary !== undefined && !isNaN(Number(e.salary)));
    const totalPayroll = withSalary.reduce((sum, e) => sum + Number(e.salary), 0);
    const avgSalary = withSalary.length > 0 ? totalPayroll / withSalary.length : 0;
    const highestSalary = withSalary.length > 0 ? Math.max(...withSalary.map((e) => Number(e.salary))) : 0;

    return { total, totalPayroll, avgSalary, highestSalary };
  }, [employees]);

  return (
    <div className="app-shell">
      {/* Toast Notification */}
      {toast && (
        <div className="toast-notice" role="alert">
          <span style={{ color: "#4ade80" }}>✓</span>
          <span>{toast}</span>
        </div>
      )}

      {/* ADD EMPLOYEE MODAL */}
      {showAddModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="add-dialog-title">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 id="add-dialog-title">+ Add New Employee</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowAddModal(false)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveAdd}>
              <div className="modal-body">
                {addError && <div className="error-message">{addError}</div>}

                <div className="field">
                  <label htmlFor="add-name">
                    Full Name <span className="required-mark">*</span>
                  </label>
                  <input
                    id="add-name"
                    type="text"
                    placeholder="e.g. Rachel Adams"
                    required
                    maxLength={100}
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="add-salary">Salary (USD / Annual or Monthly)</label>
                  <input
                    id="add-salary"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 75000"
                    value={addSalary}
                    onChange={(e) => setAddSalary(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="add-email">Email Address</label>
                  <input
                    id="add-email"
                    type="email"
                    placeholder="rachel@company.com"
                    maxLength={150}
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="add-phone">Phone Number</label>
                  <input
                    id="add-phone"
                    type="tel"
                    placeholder="e.g. +1 555 123 4567"
                    maxLength={15}
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label htmlFor="add-address">Address</label>
                  <textarea
                    id="add-address"
                    rows={3}
                    placeholder="Enter employee's address..."
                    maxLength={255}
                    value={addAddress}
                    onChange={(e) => setAddAddress(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmittingAdd}
                >
                  {isSubmittingAdd ? "Saving to SQL Server..." : "Add Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE MODAL (Name & Salary updates) */}
      {editingEmployee && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="edit-dialog-title">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 id="edit-dialog-title">
                Edit Employee #{editingEmployee.employee_id}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setEditingEmployee(null)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                {editError && <div className="error-message">{editError}</div>}

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
                  <label htmlFor="edit-salary">
                    Salary (USD / Annual or Monthly)
                  </label>
                  <input
                    id="edit-salary"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g. 85000"
                    value={editSalary}
                    onChange={(e) => setEditSalary(e.target.value)}
                  />
                  <span className="field-hint">Update employee salary in SQL Server database.</span>
                </div>

                <div className="field">
                  <label htmlFor="edit-email">Email Address</label>
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
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditingEmployee(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={isSubmittingEdit}
                >
                  {isSubmittingEdit ? "Updating SQL Server..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <Link className="brand" href="/dashboard" aria-label="People home">
          <BrandMark />
          <span>people<span className="brand-period">.</span></span>
        </Link>
        <div className="workspace-switcher">
          <div className="workspace-avatar">HR</div>
          <div className="workspace-copy">
            <span className="eyebrow">ADMIN PORTAL</span>
            <strong>Northstar HR Studio</strong>
          </div>
          <span className="chevron">⌄</span>
        </div>
        <span className="nav-label">MAIN NAVIGATION</span>
        <nav className="primary-nav" aria-label="Main navigation">
          <Link className="nav-link active" href="/dashboard">
            <NavIcon name="people" />
            <span>Employee Dashboard</span>
            <span className="nav-count">{employees.length}</span>
          </Link>
          <button
            type="button"
            className="nav-link"
            onClick={() => setShowAddModal(true)}
            style={{ border: "none", background: "none", width: "100%", textAlign: "left", cursor: "pointer" }}
          >
            <NavIcon name="add" />
            <span>+ Add Employee</span>
          </button>
          <Link className="nav-link" href="/employees">
            <NavIcon name="overview" />
            <span>Directory Grid</span>
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="profile-card">
            <div className="profile-avatar" style={{ background: "#ede9fe", color: "#6d28d9" }}>
              AD
            </div>
            <div className="profile-copy">
              <strong>{adminUser}</strong>
              <span>System Administrator</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-area">
        {/* Topbar with Admin User Info and Logout */}
        <header className="topbar">
          <div className="breadcrumb">
            <span>Admin Portal</span>
            <span className="breadcrumb-slash">/</span>
            <strong>Employee Dashboard</strong>
          </div>
          <div className="heading-actions-wrap">
            <div className="admin-user-pill">
              <span className="status-dot" aria-hidden="true" />
              <span>Admin: <strong>{adminUser}</strong></span>
            </div>
            <button
              type="button"
              className="btn-icon"
              onClick={() => loadEmployees(true)}
              title="Refresh database records"
              aria-label="Refresh database records"
              disabled={refreshing}
            >
              <svg className={refreshing ? "spinning" : ""} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19" />
              </svg>
            </button>
            <button
              type="button"
              className="logout-btn"
              onClick={handleLogout}
              title="Log out of admin session"
              id="logout-btn"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </header>

        <div className="content content-wide">
          {/* Page Heading */}
          <div className="page-heading">
            <div>
              <h1>Employee Management Dashboard</h1>
              <p className="page-description">
                Real-time CRUD operations connected directly to SQL Server database (<code>employee_db.dbo.Employee</code>).
              </p>
            </div>
            <div className="heading-actions-wrap">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowAddModal(true)}
                id="add-employee-btn"
              >
                <span aria-hidden="true">+</span> Add Employee
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-card-content">
                <span className="kpi-label">Total Employees</span>
                <span className="kpi-value">{stats.total}</span>
                <span className="kpi-sub">Registered in SQL Server</span>
              </div>
              <div className="kpi-icon purple">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-card-content">
                <span className="kpi-label">Average Salary</span>
                <span className="kpi-value">{formatSalary(stats.avgSalary)}</span>
                <span className="kpi-sub">Organization average</span>
              </div>
              <div className="kpi-icon green">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="1" x2="12" y2="23" />
                  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-card-content">
                <span className="kpi-label">Total Payroll</span>
                <span className="kpi-value">{formatSalary(stats.totalPayroll)}</span>
                <span className="kpi-sub">Total compensation</span>
              </div>
              <div className="kpi-icon blue">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </div>
            </div>

            <div className="kpi-card">
              <div className="kpi-card-content">
                <span className="kpi-label">Database Status</span>
                <span className="kpi-value" style={{ fontSize: "18px", color: "#16a34a" }}>Active</span>
                <span className="kpi-sub" style={{ color: "#15803d" }}>
                  <span className="status-dot" aria-hidden="true" style={{ width: "6px", height: "6px" }} />
                  SQLEXPRESS Connected
                </span>
              </div>
              <div className="kpi-icon amber">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <ellipse cx="12" cy="5" rx="9" ry="3" />
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                </svg>
              </div>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="error-message" role="alert" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <span>{errorMessage}</span>
              <button
                type="button"
                className="btn-secondary"
                style={{ height: "30px", minHeight: "auto", padding: "0 10px", fontSize: "11px" }}
                onClick={() => loadEmployees(true)}
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
                placeholder="Search by name, salary, email, phone, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                id="dashboard-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
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
                <label htmlFor="dashboard-sort">Sort by:</label>
                <select
                  id="dashboard-sort"
                  className="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                >
                  <option value="newest">Newest First</option>
                  <option value="salary-desc">Salary: High → Low</option>
                  <option value="salary-asc">Salary: Low → High</option>
                  <option value="name-asc">Name (A → Z)</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>

              {/* View Switcher: Table View vs Card Grid View */}
              <div className="view-switcher" role="group" aria-label="View mode">
                <button
                  type="button"
                  className={`view-btn ${viewMode === "table" ? "active" : ""}`}
                  onClick={() => setViewMode("table")}
                  aria-label="Table View"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                  <span>Table View</span>
                </button>
                <button
                  type="button"
                  className={`view-btn ${viewMode === "grid" ? "active" : ""}`}
                  onClick={() => setViewMode("grid")}
                  aria-label="Card Grid View"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  </svg>
                  <span>Card Grid</span>
                </button>
              </div>
            </div>
          </div>

          {/* Loading Skeleton */}
          {loading && (
            <div className="skeleton-grid">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton-card">
                  <div className="skeleton-line" style={{ width: "60%" }} />
                  <div className="skeleton-line" style={{ width: "85%" }} />
                  <div className="skeleton-line" style={{ width: "70%" }} />
                </div>
              ))}
            </div>
          )}

          {/* Empty Database State */}
          {!loading && employees.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 21v-1a7 7 0 0 1 14 0v1" />
                </svg>
              </div>
              <h3>No Employees Registered in Database</h3>
              <p>Your SQL Server database currently has no employee records. Click below to add the first employee.</p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowAddModal(true)}
              >
                + Add First Employee
              </button>
            </div>
          )}

          {/* Empty Search Filter State */}
          {!loading && employees.length > 0 && filteredEmployees.length === 0 && (
            <div className="empty-state">
              <h3>No Records Match Your Search</h3>
              <p>No employees match &ldquo;{searchQuery}&rdquo;. Try clearing your filter.</p>
              <button type="button" className="btn-secondary" onClick={() => setSearchQuery("")}>
                Clear Filter
              </button>
            </div>
          )}

          {/* 1. VIEW TABLE OF ALL EMPLOYEES */}
          {!loading && filteredEmployees.length > 0 && viewMode === "table" && (
            <div className="table-card">
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: "60px" }}>ID</th>
                      <th>Employee Name</th>
                      <th>Salary</th>
                      <th>Email ID</th>
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
                        <tr key={emp.employee_id} id={`employee-row-${emp.employee_id}`}>
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
                              <strong style={{ fontSize: "14px" }}>{emp.name}</strong>
                            </div>
                          </td>
                          <td>
                            {emp.salary !== null && emp.salary !== undefined ? (
                              <span className="salary-pill">
                                {formatSalary(emp.salary)}
                              </span>
                            ) : (
                              <span className="contact-placeholder">—</span>
                            )}
                          </td>
                          <td>
                            {emp.email_id ? (
                              <a href={`mailto:${emp.email_id}`} style={{ color: "var(--purple)", fontWeight: 500 }}>
                                {emp.email_id}
                              </a>
                            ) : (
                              <span className="contact-placeholder">—</span>
                            )}
                          </td>
                          <td>
                            {emp.phone_number ? (
                              <span>{emp.phone_number}</span>
                            ) : (
                              <span className="contact-placeholder">—</span>
                            )}
                          </td>
                          <td>
                            {emp.address ? (
                              <span title={emp.address}>{emp.address}</span>
                            ) : (
                              <span className="contact-placeholder">—</span>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "6px" }}>
                              <button
                                type="button"
                                className="edit-btn"
                                onClick={() => handleOpenEdit(emp)}
                                title="Edit employee (update salary, name, etc.)"
                                id={`edit-btn-${emp.employee_id}`}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                                <span>Edit</span>
                              </button>
                              <button
                                type="button"
                                className="delete-btn"
                                onClick={() => handleDelete(emp.employee_id, emp.name)}
                                title={`Delete ${emp.name} from SQL Server`}
                                disabled={deletingId === emp.employee_id}
                                id={`delete-btn-${emp.employee_id}`}
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

          {/* 2. CARD GRID VIEW (ALTERNATIVE VIEW) */}
          {!loading && filteredEmployees.length > 0 && viewMode === "grid" && (
            <div className="employee-grid">
              {filteredEmployees.map((emp) => {
                const palette = getPalette(emp.name, emp.employee_id);
                const initials = getInitials(emp.name);

                return (
                  <article key={emp.employee_id} className="employee-card">
                    <div
                      className="employee-card-banner"
                      style={{
                        background: `linear-gradient(90deg, ${palette.color}, #7057d9, #c4b5fd)`,
                      }}
                    />
                    <div className="employee-card-body">
                      <div className="card-header-row">
                        <div className="avatar-name-wrap">
                          <div
                            className="card-avatar"
                            style={{ backgroundColor: palette.bg, color: palette.color }}
                          >
                            {initials}
                          </div>
                          <div className="emp-details-wrap">
                            <h3 className="emp-name" title={emp.name}>
                              {emp.name}
                            </h3>
                            <div style={{ marginTop: "4px" }}>
                              {emp.salary !== null && emp.salary !== undefined ? (
                                <span className="salary-pill">{formatSalary(emp.salary)}</span>
                              ) : (
                                <span className="emp-role-tag">No salary set</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="emp-id-pill">#{emp.employee_id}</span>
                      </div>

                      <div className="contact-info-list">
                        <div className="contact-row">
                          <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                            <polyline points="22,6 12,13 2,6" />
                          </svg>
                          {emp.email_id ? (
                            <a href={`mailto:${emp.email_id}`}>{emp.email_id}</a>
                          ) : (
                            <span className="contact-placeholder">No email</span>
                          )}
                        </div>

                        <div className="contact-row">
                          <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                          </svg>
                          {emp.phone_number ? (
                            <a href={`tel:${emp.phone_number}`}>{emp.phone_number}</a>
                          ) : (
                            <span className="contact-placeholder">No phone</span>
                          )}
                        </div>

                        <div className="contact-row">
                          <svg className="contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                          </svg>
                          {emp.address ? (
                            <span>{emp.address}</span>
                          ) : (
                            <span className="contact-placeholder">No address</span>
                          )}
                        </div>
                      </div>

                      <div className="card-footer-row">
                        <button
                          type="button"
                          className="edit-btn"
                          onClick={() => handleOpenEdit(emp)}
                          title="Edit employee"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          className="delete-btn"
                          onClick={() => handleDelete(emp.employee_id, emp.name)}
                          title={`Delete ${emp.name}`}
                          disabled={deletingId === emp.employee_id}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <footer className="page-footer">
            Admin Employee Dashboard <span>·</span> Connected to SQL Server <code>employee_db.dbo.Employee</code> & <code>dbo.AdminUser</code>.
          </footer>
        </div>
      </main>
    </div>
  );
}
