# Employee Management & Admin HR Portal

A modern, full-stack Employee Management and HR Administration application built with **Next.js (App Router)**, **TypeScript**, and **Microsoft SQL Server**.

---

## 🌟 Key Features

* **Admin Authentication Flow:**
  * Secure Admin Sign In page (`/login`)
  * Database credential verification against SQL Server (`dbo.AdminUser`)
  * Default administrator credentials (`admin` / `admin123`) with one-click autofill
  * Session-protected routes with automatic redirection
* **Employee Management Dashboard (`/dashboard`):**
  * **View (Read):** Real-time data table and card grid rendering of all employees from SQL Server
  * **Create (Add):** Interactive employee registration modal (Name, Salary, Email, Phone, Address)
  * **Update (Edit):** In-place editing modal specifically supporting **Salary** and **Name** updates with instant database synchronization
  * **Delete:** Secure record removal with confirmation dialogs
* **Employee Directory Grid View (`/employees`):**
  * Responsive card grid with dynamic avatar initials and ID badges
  * Instant real-time search across Name, Salary, Email, Phone, and Address
  * Multi-attribute sorting (Salary, Name, Date)
  * Switcher between Card Grid and Compact Table views
* **SQL Server Database Integration:**
  * Connected via `mssql` and `msnodesqlv8` using Windows Trusted Connection
  * Automatic table schema provisioning: `dbo.Employee` and `dbo.AdminUser`

---

## 🛠️ Tech Stack

* **Frontend:** Next.js (React 19, TypeScript, Vanilla CSS)
* **Backend:** Next.js Route Handlers (Node.js runtime)
* **Database:** Microsoft SQL Server (Local `SQLEXPRESS`, Database: `employee_db`)
* **Driver:** `ODBC Driver 18 for SQL Server` / `msnodesqlv8`

---

## 🚀 Getting Started

### 1. Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher)
* [Microsoft SQL Server](https://www.microsoft.com/en-us/sql-server/) (e.g. `SQLEXPRESS`)
* [ODBC Driver 18 for SQL Server](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server)

### 2. Database Setup
Create the database in SQL Server (or SQL Server Management Studio):
```sql
CREATE DATABASE employee_db;
```
The application will automatically provision the `dbo.Employee` and `dbo.AdminUser` tables and seed default admin credentials on the first run.

### 3. Installation & Run
```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Default Admin Credentials
* **Username:** `admin`
* **Password:** `admin123`

---

## 👤 Author
* GitHub: [@Anjali-Reddy07](https://github.com/Anjali-Reddy07)
