import { renderButton } from "./components";

const BRAND_COLOR = "#1e3a5f";
const ACCENT_COLOR = "#2563eb";
const MUTED_COLOR = "#64748b";
const BORDER_COLOR = "#e2e8f0";
const BG_COLOR = "#f8fafc";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type EmailLayoutOptions = {
  preheader?: string;
  businessName?: string;
  businessLogoUrl?: string | null;
  heading: string;
  bodyHtml: string;
  actionLabel?: string;
  actionUrl?: string;
  footerNote?: string;
};

export function renderEmailLayout(options: EmailLayoutOptions): string {
  const preheader = options.preheader ? escapeHtml(options.preheader) : "";
  const heading = escapeHtml(options.heading);
  const businessName = options.businessName ? escapeHtml(options.businessName) : "";
  const logoBlock = options.businessLogoUrl
    ? `<img src="${escapeHtml(options.businessLogoUrl)}" alt="${businessName}" width="64" height="64" style="display:block;border-radius:12px;object-fit:cover;margin:0 auto 16px;" />`
    : "";
  const actionBlock =
    options.actionLabel && options.actionUrl
      ? `<div style="text-align:center;margin:32px 0 8px;">${renderButton(options.actionLabel, options.actionUrl)}</div>`
      : "";
  const footerNote = options.footerNote
    ? `<p style="margin:24px 0 0;font-size:13px;color:${MUTED_COLOR};line-height:1.5;">${options.footerNote}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:${BG_COLOR};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  <span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden;">${preheader}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BG_COLOR};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid ${BORDER_COLOR};border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background:${BRAND_COLOR};padding:20px 32px;text-align:center;">
              <div style="font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#93c5fd;">TownHub</div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${logoBlock}
              <h1 style="margin:0 0 20px;font-size:26px;line-height:1.25;font-weight:700;color:${BRAND_COLOR};text-align:center;">${heading}</h1>
              ${options.bodyHtml}
              ${actionBlock}
              ${footerNote}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#f1f5f9;border-top:1px solid ${BORDER_COLOR};text-align:center;">
              <p style="margin:0;font-size:12px;color:${MUTED_COLOR};line-height:1.5;">
                Powered by <strong style="color:${BRAND_COLOR};">TownHub</strong> · Supporting local businesses
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderParagraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155;">${text}</p>`;
}

export function renderMutedParagraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:${MUTED_COLOR};">${text}</p>`;
}

export { ACCENT_COLOR, MUTED_COLOR, BORDER_COLOR };
