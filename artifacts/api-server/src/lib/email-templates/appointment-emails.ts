import { formatTime12h } from "@workspace/api-zod";
import { dashboardAppointmentsUrl } from "../notification-urls";
import { renderDetailTable, renderStatusBadge } from "./components";
import { escapeHtml, renderEmailLayout, renderMutedParagraph, renderParagraph } from "./layout";
import type { AppointmentNotificationData, EmailContent } from "./types";

function formatAppointmentDate(date: string): string {
  const parts = date.split("-").map((part) => parseInt(part, 10));
  const [year, month, day] = parts;
  if (!year || !month || !day) return date;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function formatAppointmentWhen(date: string, time: string): string {
  return `${formatAppointmentDate(date)} at ${formatTime12h(time)}`;
}

function appointmentDetailRows(
  data: AppointmentNotificationData,
): Array<{ label: string; value: string }> {
  return [
    { label: "Customer", value: data.customerName },
    { label: "Service", value: data.serviceName?.trim() ?? "—" },
    { label: "Requested time", value: formatAppointmentWhen(data.requestedDate, data.requestedTime) },
    { label: "Email", value: data.customerEmail?.trim() ?? "—" },
    { label: "Phone", value: data.customerPhone?.trim() ?? "—" },
  ];
}

function renderNotesBlock(title: string, notes: string): string {
  return `<div style="margin:24px 0;padding:16px 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
    <div style="font-size:13px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">${escapeHtml(title)}</div>
    <p style="margin:0;font-size:15px;line-height:1.6;color:#334155;">${escapeHtml(notes)}</p>
  </div>`;
}

function appointmentSummaryHtml(data: AppointmentNotificationData, options?: { notesTitle?: string }): string {
  const notesBlock = data.notes?.trim()
    ? renderNotesBlock(options?.notesTitle ?? "Customer notes", data.notes.trim())
    : "";
  return `${renderDetailTable(appointmentDetailRows(data))}${notesBlock}`;
}

export function buildOwnerNewAppointmentEmail(data: AppointmentNotificationData): EmailContent {
  const appointmentsUrl = dashboardAppointmentsUrl();
  const bodyHtml = appointmentSummaryHtml(data);
  const html = renderEmailLayout({
    preheader: `New appointment request from ${data.customerName} at ${data.businessName}.`,
    businessName: data.businessName,
    businessLogoUrl: data.businessLogoUrl,
    heading: "New Appointment Request",
    bodyHtml,
    actionLabel: "Review Request",
    actionUrl: appointmentsUrl,
    footerNote: "Review and confirm or decline this request from your Business Hub.",
  });

  const text = [
    "New Appointment Request",
    "",
    `Business: ${data.businessName}`,
    `Customer: ${data.customerName}`,
    data.serviceName ? `Service: ${data.serviceName}` : "",
    `Requested: ${formatAppointmentWhen(data.requestedDate, data.requestedTime)}`,
    data.customerEmail ? `Email: ${data.customerEmail}` : "",
    data.customerPhone ? `Phone: ${data.customerPhone}` : "",
    data.notes ? `Notes: ${data.notes}` : "",
    "",
    `Review Request: ${appointmentsUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `New appointment request — ${data.businessName}`,
    text,
    html,
  };
}

export function buildCustomerAppointmentStatusEmail(
  data: AppointmentNotificationData & { status: "CONFIRMED" | "DECLINED" },
): EmailContent {
  if (data.status === "CONFIRMED") {
    return buildCustomerAppointmentConfirmedEmail(data);
  }
  return buildCustomerAppointmentDeclinedEmail(data);
}

function buildCustomerAppointmentConfirmedEmail(data: AppointmentNotificationData): EmailContent {
  const business = escapeHtml(data.businessName);
  const greeting = `Hi ${escapeHtml(data.customerName)},`;
  const servicePhrase = data.serviceName ? ` for ${escapeHtml(data.serviceName)}` : "";
  const when = formatAppointmentWhen(data.requestedDate, data.requestedTime);

  const introHtml = [
    renderParagraph(greeting),
    renderParagraph(
      `Good news — ${business} confirmed your appointment request${servicePhrase}.`,
    ),
    renderParagraph(`Your confirmed time is <strong>${escapeHtml(when)}</strong>.`),
  ].join("");

  const badgeHtml = `<div style="text-align:center;margin-bottom:20px;">${renderStatusBadge("Confirmed", "success")}</div>`;
  const bodyHtml = `${badgeHtml}${introHtml}${appointmentSummaryHtml(data)}`;

  const html = renderEmailLayout({
    preheader: `${data.businessName} confirmed your appointment for ${when}.`,
    businessName: data.businessName,
    businessLogoUrl: data.businessLogoUrl,
    heading: "Appointment Confirmed",
    bodyHtml,
    footerNote: `Need to make changes? Contact ${data.businessName} directly.`,
  });

  const text = [
    `Hi ${data.customerName},`,
    "",
    `Good news — ${data.businessName} confirmed your appointment request${data.serviceName ? ` for ${data.serviceName}` : ""}.`,
    "",
    `When: ${when}`,
    "",
    `Need to make changes? Contact ${data.businessName} directly.`,
  ].join("\n");

  return {
    subject: `Appointment confirmed — ${data.businessName}`,
    text,
    html,
  };
}

function buildCustomerAppointmentDeclinedEmail(
  data: AppointmentNotificationData,
): EmailContent {
  const business = escapeHtml(data.businessName);
  const greeting = `Hi ${escapeHtml(data.customerName)},`;
  const servicePhrase = data.serviceName ? ` for ${escapeHtml(data.serviceName)}` : "";
  const when = formatAppointmentWhen(data.requestedDate, data.requestedTime);

  const introHtml = [
    renderParagraph(greeting),
    renderParagraph(
      `${business} was unable to confirm your appointment request${servicePhrase} for ${escapeHtml(when)}.`,
    ),
    renderMutedParagraph(
      "This was a request only — your time was not reserved until the business confirmed it.",
    ),
  ].join("");

  const noteBlock = data.statusNote?.trim()
    ? renderNotesBlock("Message from the business", data.statusNote.trim())
    : "";

  const badgeHtml = `<div style="text-align:center;margin-bottom:20px;">${renderStatusBadge("Not confirmed", "danger")}</div>`;
  const bodyHtml = `${badgeHtml}${introHtml}${noteBlock}${appointmentSummaryHtml(data)}`;

  const html = renderEmailLayout({
    preheader: `Update on your appointment request with ${data.businessName}.`,
    businessName: data.businessName,
    businessLogoUrl: data.businessLogoUrl,
    heading: "Appointment Not Confirmed",
    bodyHtml,
    footerNote: "Please contact the business to find another time that works.",
  });

  const text = [
    `Hi ${data.customerName},`,
    "",
    `${data.businessName} was unable to confirm your appointment request${data.serviceName ? ` for ${data.serviceName}` : ""} for ${when}.`,
    "This was a request only — your time was not reserved until the business confirmed it.",
    data.statusNote ? `\nMessage from the business: ${data.statusNote}` : "",
    "",
    "Please contact the business to find another time that works.",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `Appointment update — ${data.businessName}`,
    text,
    html,
  };
}
