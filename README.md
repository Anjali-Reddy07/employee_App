# Employee Management & Admin HR Portal

A modern, full-stack Employee Management and HR Administration application built with **Next.js (App Router)**, **TypeScript**, and **Neon Serverless PostgreSQL**.

---

## 🌟 Key Features

* **Admin Authentication Flow:**
  * Secure Admin Sign In page (`/login`) and First-time Setup (`/setup`)
  * Database credential verification against PostgreSQL (`admin_user` table) with `bcryptjs` hashing
  * Session-protected routes with cookie-based authentication
* **Employee Management Dashboard (`/dashboard`):**
  * **View (Read):** Real-time data table and card grid rendering of all employees from Neon PostgreSQL
  * **Create (Add):** Interactive employee registration modal (Name, Salary, Email, Phone, Address)
  * **Update (Edit):** In-place editing modal supporting employee details and salary updates
  * **Delete:** Secure record removal with confirmation dialogs
* **Email Change Notifications:**
  * Automated email alerts dispatched on employee additions, updates, and deletions via Nodemailer SMTP
* **Employee Directory Grid View (`/employees`):**
  * Responsive card grid with dynamic avatar initials and ID badges
  * Instant real-time search across Name, Salary, Email, Phone, and Address
  * Multi-attribute sorting (Salary, Name, Date)
  * Switcher between Card Grid and Compact Table views
* **Neon Serverless Database Integration:**
  * Connected via `@neondatabase/serverless` connection pooling
  * Automatic table schema provisioning: `employee` and `admin_user`

---

## 🛠️ Tech Stack

* **Frontend:** Next.js 16 (React 19, TypeScript, Vanilla CSS)
* **Backend:** Next.js Route Handlers (`app/api/`, Node.js runtime)
* **Database:** Neon Serverless PostgreSQL (`@neondatabase/serverless`)
* **Email:** Nodemailer (SMTP / Gmail)
* **Deployment:** Vercel

---

## 🚀 Getting Started

### 1. Prerequisites
* [Node.js](https://nodejs.org/) (v18 or higher)
* A [Neon PostgreSQL](https://neon.tech/) database project

### 2. Environment Variables Setup
Create a `.env.local` file in the root directory:
```env
DATABASE_URL=postgresql://neondb_owner:<password>@<host>/neondb?sslmode=require
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
ADMIN_EMAIL=recipient_email@example.com
```

The application will automatically provision the `employee` and `admin_user` tables on first run.

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
