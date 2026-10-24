/**
 * lib/email.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Central Nodemailer helper for Employee Management Portal notifications.
 *
 * Requirements:
 * 1. Trigger Events:
 *    - Employee Added: Send an email whenever a new employee is created.
 *    - Employee Updated/Edited: Send an email whenever employee details are modified.
 *    - Employee Deleted: Send an email whenever an employee record is deleted.
 * 2. Email Content:
 *    - Subject: [Action Alert] Employee [Added / Updated / Deleted]: [Employee Name]
 *    - Body Details:
 *        • Action Type (Created, Updated, or Deleted)
 *        • Timestamp of the change
 *        • Performed By (Admin / User ID who made the change)
 *        • Summary of changes (for updates, show previous vs. new values)
 *        • Employee ID and Full Name
 * 3. Technical Setup:
 *    - Uses Nodemailer with SMTP / Gmail configuration.
 *    - Recipient address pulled dynamically from ADMIN_EMAIL (or EMAIL_TO / fallback).
 *    - Asynchronous / non-blocking fire-and-forget dispatch (doesn't delay DB API).
 *    - Wrapped in try/catch to ensure API operations succeed even if SMTP errors occur.
 */

import nodemailer from "nodemailer";

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationAction = "Added" | "Updated" | "Deleted";

export interface EmployeeSnapshot {
  employeeId: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  salary?: number | null;
}

export interface EmployeeNotificationPayload {
  action: NotificationAction;
  performedBy: string;           // Admin username / ID who made the change
  current: EmployeeSnapshot;     // New / current values
  previous?: EmployeeSnapshot;   // Before values (for "Updated" diff)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "") return "—";
  return String(val);
}

function fmtSalary(val: number | null | undefined): string {
  if (val === null || val === undefined) return "—";
  return `$${Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function tableRow(label: string, value: string, shaded: boolean): string {
  const bg = shaded ? "#f8fafc" : "#ffffff";
  return `
    <tr style="background:${bg}">
      <td style="padding:10px 16px;font-weight:600;color:#374151;width:34%;border-bottom:1px solid #e5e7eb;font-size:13px">${label}</td>
      <td style="padding:10px 16px;color:#111827;border-bottom:1px solid #e5e7eb;font-size:13px">${value}</td>
    </tr>`;
}

function diffRow(label: string, before: string, after: string, shaded: boolean): string {
  const changed = before !== after;
  const bg = shaded ? "#f8fafc" : "#ffffff";
  const afterCell = changed
    ? `<span style="background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:4px;font-weight:700">${after}</span>`
    : `<span style="color:#475569">${after}</span>`;
  const beforeCell = changed
    ? `<span style="background:#fee2e2;color:#b91c1c;padding:2px 8px;border-radius:4px;text-decoration:line-through">${before}</span>`
    : `<span style="color:#64748b">${before}</span>`;

  return `
    <tr style="background:${bg}">
      <td style="padding:10px 16px;font-weight:600;color:#374151;width:28%;border-bottom:1px solid #e5e7eb;font-size:13px">${label}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;width:36%">${beforeCell}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;font-size:13px;width:36%">${afterCell}</td>
    </tr>`;
}

// ─── HTML Email Builder ───────────────────────────────────────────────────────

function buildHtmlEmail(payload: EmployeeNotificationPayload): string {
  const { action, performedBy, current, previous } = payload;

  const palette: Record<NotificationAction, { bg: string; light: string; badgeText: string; emoji: string }> = {
    Added:   { bg: "#1d4ed8", light: "#dbeafe", badgeText: "EMPLOYEE CREATED", emoji: "🎉" },
    Updated: { bg: "#0f766e", light: "#ccfbf1", badgeText: "EMPLOYEE UPDATED", emoji: "✏️" },
    Deleted: { bg: "#b91c1c", light: "#fee2e2", badgeText: "EMPLOYEE DELETED", emoji: "🗑️" },
  };
  const { bg, light, badgeText, emoji } = palette[action];

  const now = new Date();
  const timestampLocal = now.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }) + " (IST)";
  const timestampUTC = now.toUTCString();

  const actionDisplay = action === "Added" ? "Created" : action === "Updated" ? "Updated" : "Deleted";

  // 1. Meta Section
  const metaSection = `
    <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:20px">
      ${tableRow("Action Type", `<span style="background:${light};color:${bg};padding:3px 12px;border-radius:16px;font-weight:700;font-size:12px;letter-spacing:.03em">${emoji} ${actionDisplay.toUpperCase()}</span>`, false)}
      ${tableRow("Timestamp", `${timestampLocal} <br><span style="font-size:11px;color:#64748b">${timestampUTC}</span>`, true)}
      ${tableRow("Performed By", `<strong>${performedBy}</strong>`, false)}
      ${tableRow("Employee ID", `<code style="background:#f1f5f9;color:#0f172a;padding:2px 8px;border-radius:4px;font-weight:700">#${current.employeeId}</code>`, true)}
      ${tableRow("Full Name", `<strong>${fmt(current.name)}</strong>`, false)}
    </table>`;

  // 2. Specific Action Sections
  let detailSection = "";

  if (action === "Added") {
    detailSection = `
      <div style="margin-bottom:20px">
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#1e293b;text-transform:uppercase;letter-spacing:.05em">Employee Details</p>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
          ${tableRow("Email Address", fmt(current.email), false)}
          ${tableRow("Phone Number", fmt(current.phone), true)}
          ${tableRow("Address", fmt(current.address), false)}
          ${tableRow("Salary", fmtSalary(current.salary), true)}
        </table>
      </div>`;
  } else if (action === "Deleted") {
    detailSection = `
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 18px;margin-bottom:20px">
        <p style="margin:0 0 6px;font-weight:700;color:#991b1b;font-size:14px">Record Deactivated / Deleted</p>
        <p style="margin:0;font-size:13px;color:#b91c1c;line-height:1.5">
          Employee <strong>${fmt(current.name)}</strong> (ID #${current.employeeId}) was permanently removed from the system by <strong>${performedBy}</strong>.
        </p>
      </div>`;
  } else if (action === "Updated" && previous) {
    const fields: Array<[string, string, string]> = [
      ["Full Name",     fmt(previous.name),         fmt(current.name)],
      ["Email Address", fmt(previous.email),        fmt(current.email)],
      ["Phone Number",  fmt(previous.phone),        fmt(current.phone)],
      ["Address",       fmt(previous.address),      fmt(current.address)],
      ["Salary",        fmtSalary(previous.salary), fmtSalary(current.salary)],
    ];
    const changed = fields.filter(([, b, a]) => b !== a);
    const unchanged = fields.filter(([, b, a]) => b === a);

    detailSection = `
      <div style="margin-bottom:20px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <p style="margin:0;font-size:13px;font-weight:700;color:#1e293b;text-transform:uppercase;letter-spacing:.05em">Summary of Changes</p>
          <span style="background:${light};color:${bg};padding:2px 10px;border-radius:12px;font-size:11px;font-weight:700">
            ${changed.length} Field${changed.length !== 1 ? "s" : ""} Modified
          </span>
        </div>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
          <thead>
            <tr style="background:#f1f5f9">
              <th style="padding:10px 16px;text-align:left;font-size:11px;color:#475569;letter-spacing:.06em;width:28%">FIELD</th>
              <th style="padding:10px 16px;text-align:left;font-size:11px;color:#475569;letter-spacing:.06em;width:36%">PREVIOUS VALUE</th>
              <th style="padding:10px 16px;text-align:left;font-size:11px;color:#475569;letter-spacing:.06em;width:36%">NEW VALUE</th>
            </tr>
          </thead>
          <tbody>
            ${changed.map(([label, b, a], i) => diffRow(label, b, a, i % 2 === 1)).join("")}
            ${unchanged.map(([label, val], i) => diffRow(label, val, val, (changed.length + i) % 2 === 1)).join("")}
          </tbody>
        </table>
      </div>`;
  }

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:620px;margin:0 auto;background:#f8fafc;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05)">
      <!-- Header Banner -->
      <div style="background:${bg};padding:26px 30px">
        <div style="display:inline-block;background:${light};color:${bg};font-size:11px;font-weight:800;letter-spacing:.08em;padding:4px 12px;border-radius:20px;margin-bottom:10px">
          ${emoji} ${badgeText}
        </div>
        <h1 style="color:#ffffff;margin:0 0 6px;font-size:20px;font-weight:700">
          [Action Alert] Employee ${action}: ${fmt(current.name)}
        </h1>
        <p style="color:rgba(255,255,255,0.85);margin:0;font-size:13px">
          Employee Management Portal · Real-time Admin Notification
        </p>
      </div>

      <!-- Content Container -->
      <div style="padding:26px 30px;background:#ffffff">
        ${metaSection}
        ${detailSection}

        <!-- Footer -->
        <div style="padding-top:16px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:11px;line-height:1.5">
          <p style="margin:0 0 4px"><strong>Confidentiality Notice:</strong> This notification was generated automatically following an employee record modification.</p>
          <p style="margin:0">Sent by Employee Management Portal to designated administrators. Please do not reply directly to this email.</p>
        </div>
      </div>
    </div>`;
}

// ─── Plain Text Fallback Builder ──────────────────────────────────────────────

function buildPlainTextEmail(payload: EmployeeNotificationPayload): string {
  const { action, performedBy, current, previous } = payload;
  const actionDisplay = action === "Added" ? "Created" : action === "Updated" ? "Updated" : "Deleted";
  const timestamp = new Date().toISOString();

  let text = `==========================================================\n`;
  text += `[Action Alert] Employee ${action}: ${fmt(current.name)}\n`;
  text += `==========================================================\n\n`;
  text += `Action Type:   ${actionDisplay}\n`;
  text += `Timestamp:     ${timestamp}\n`;
  text += `Performed By:  ${performedBy}\n`;
  text += `Employee ID:   #${current.employeeId}\n`;
  text += `Full Name:     ${fmt(current.name)}\n\n`;

  if (action === "Added") {
    text += `Employee Details:\n`;
    text += `  • Email:   ${fmt(current.email)}\n`;
    text += `  • Phone:   ${fmt(current.phone)}\n`;
    text += `  • Address: ${fmt(current.address)}\n`;
    text += `  • Salary:  ${fmtSalary(current.salary)}\n\n`;
  } else if (action === "Deleted") {
    text += `Status: Record was permanently removed from the database.\n\n`;
  } else if (action === "Updated" && previous) {
    text += `Summary of Changes:\n`;
    text += `  • Name:    ${fmt(previous.name)} -> ${fmt(current.name)}\n`;
    text += `  • Email:   ${fmt(previous.email)} -> ${fmt(current.email)}\n`;
    text += `  • Phone:   ${fmt(previous.phone)} -> ${fmt(current.phone)}\n`;
    text += `  • Address: ${fmt(previous.address)} -> ${fmt(current.address)}\n`;
    text += `  • Salary:  ${fmtSalary(previous.salary)} -> ${fmtSalary(current.salary)}\n\n`;
  }

  text += `----------------------------------------------------------\n`;
  text += `Employee Management Portal · Automated Alert\n`;
  return text;
}

// ─── Transporter Factory ───────────────────────────────────────────────────────

function createTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) return null;

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * sendEmployeeNotification
 *
 * Runs completely asynchronously in the background so it never slows down or
 * blocks database responses. Wrapped in try/catch to guarantee that database
 * operations succeed even if email delivery encounters network or SMTP issues.
 */
export async function sendEmployeeNotification(payload: EmployeeNotificationPayload): Promise<void> {
  try {
    const transporter = createTransporter();

    if (!transporter) {
      console.warn(
        "[Email] EMAIL_USER or EMAIL_PASS not set in environment (.env.local). Skipping email dispatch."
      );
      return;
    }

    // Dynamically resolve recipient address:
    // Priority: ADMIN_EMAIL -> EMAIL_TO -> fallback
    const recipient =
      process.env.ADMIN_EMAIL ||
      process.env.EMAIL_TO ||
      "kanjalireddy29@gmail.com";

    const { action, current } = payload;
    // Exact subject line requirement:
    // Subject: [Action Alert] Employee [Added / Updated / Deleted]: [Employee Name]
    const subject = `[Action Alert] Employee ${action}: ${fmt(current.name)}`;

    await transporter.sendMail({
      from: `"Employee Management Portal" <${process.env.EMAIL_USER}>`,
      to: recipient,
      subject,
      text: buildPlainTextEmail(payload),
      html: buildHtmlEmail(payload),
    });

    console.log(
      `[Email] ✓ Notification sent successfully to <${recipient}> for action '${action}' on employee #${current.employeeId}.`
    );
  } catch (err: unknown) {
    // Catch any SMTP / network error so calling route remains unharmed
    console.error(
      `[Email] ✗ Error delivering '${payload.action}' notification:`,
      err instanceof Error ? err.message : String(err)
    );
  }
}
