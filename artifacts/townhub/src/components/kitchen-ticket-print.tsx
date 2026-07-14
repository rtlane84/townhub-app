import type { Order } from "@workspace/api-client-react";
import { formatOrderTicketNumber, formatOrderReferenceLabel } from "@workspace/api-zod";
import {
  formatKitchenFulfillment,
  formatKitchenPaymentStatus,
  formatKitchenTicketTime,
  parseKitchenSpecialFields,
} from "@/lib/kitchen-ticket-format";
import { resolveDisplayedOrderTotals } from "@/lib/order-totals-display";
import { isNativeApp } from "@/lib/native-platform";
import { KitchenPrinter } from "@/plugins/kitchen-printer";

type Props = {
  order: Order;
};

function TicketRule() {
  return <div className="kitchen-ticket-rule" aria-hidden="true" />;
}

export function KitchenTicketPrint({ order }: Props) {
  const specialLines = parseKitchenSpecialFields(order.specialFields);
  const orderTime = formatKitchenTicketTime(order.createdAt);
  const paymentStatus = formatKitchenPaymentStatus(order);
  const totals = resolveDisplayedOrderTotals(order);
  const fulfillment = formatKitchenFulfillment(order);

  const ticketLabel = formatOrderTicketNumber(order.id, "Ticket", order.businessOrderNumber);
  const referenceLabel = formatOrderReferenceLabel(order.orderNumber);

  return (
    <div className="kitchen-ticket-print hidden print:block" data-testid="kitchen-ticket-print">
      <article className="kitchen-ticket" aria-label={`Kitchen ticket for ${ticketLabel}`}>
        <header className="kitchen-ticket-header">
          <p className="kitchen-ticket-business">{order.businessName}</p>
          <p className="kitchen-ticket-kitchen-label">KITCHEN TICKET</p>
        </header>

        <TicketRule />

        <section className="kitchen-ticket-section">
          <p className="kitchen-ticket-order-number">{ticketLabel}</p>
          {referenceLabel ? <p className="kitchen-ticket-meta">{referenceLabel}</p> : null}
          {orderTime ? <p className="kitchen-ticket-meta">{orderTime}</p> : null}
          <p className="kitchen-ticket-meta">{fulfillment}</p>
          {order.status ? (
            <p className="kitchen-ticket-meta">
              Status: {order.status.replace(/_/g, " ")}
            </p>
          ) : null}
        </section>

        <TicketRule />

        <section className="kitchen-ticket-section">
          <p className="kitchen-ticket-label">Customer</p>
          <p className="kitchen-ticket-value">{order.customerName}</p>
          {order.customerPhone?.trim() ? (
            <p className="kitchen-ticket-value">{order.customerPhone.trim()}</p>
          ) : (
            <p className="kitchen-ticket-meta">No phone provided</p>
          )}
        </section>

        <TicketRule />

        <section className="kitchen-ticket-section">
          <p className="kitchen-ticket-label">Items</p>
          <ul className="kitchen-ticket-items">
            {(order.items ?? []).map((item) => (
              <li key={item.id ?? `${item.productId}-${item.productName}`} className="kitchen-ticket-item">
                <div className="kitchen-ticket-item-row">
                  <span className="kitchen-ticket-qty">{item.quantity}×</span>
                  <span className="kitchen-ticket-item-name">{item.productName}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {(order.notes?.trim() || specialLines.length > 0) && (
          <>
            <TicketRule />
            <section className="kitchen-ticket-section">
              <p className="kitchen-ticket-label">Order notes</p>
              {order.notes?.trim() ? (
                <p className="kitchen-ticket-notes">{order.notes.trim()}</p>
              ) : null}
              {specialLines.map((line) => (
                <p key={line} className="kitchen-ticket-notes">
                  {line}
                </p>
              ))}
            </section>
          </>
        )}

        <TicketRule />

        <section className="kitchen-ticket-section kitchen-ticket-footer">
          <div className="kitchen-ticket-total-row">
            <div className="kitchen-ticket-subtotal-row">
              <span>Subtotal</span>
              <span>${totals.subtotal.toFixed(2)}</span>
            </div>
            {totals.tax > 0 ? (
              <div className="kitchen-ticket-subtotal-row">
                <span>{totals.taxLabel?.trim() || "Sales Tax"}</span>
                <span>${totals.tax.toFixed(2)}</span>
              </div>
            ) : null}
            {totals.deliveryFee != null && totals.deliveryFee > 0 ? (
              <div className="kitchen-ticket-subtotal-row">
                <span>Delivery</span>
                <span>${totals.deliveryFee.toFixed(2)}</span>
              </div>
            ) : null}
            <div className="kitchen-ticket-total-row-main">
              <span>Total</span>
              <span>${totals.total.toFixed(2)}</span>
            </div>
          </div>
          <p className="kitchen-ticket-payment">Payment: {paymentStatus}</p>
        </section>

        <TicketRule />
      </article>
    </div>
  );
}

const TICKET_PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    color: #111;
    background: #fff;
    padding: 16px;
  }
  .kitchen-ticket { max-width: 320px; margin: 0 auto; }
  .kitchen-ticket-header { text-align: center; margin-bottom: 8px; }
  .kitchen-ticket-business { font-size: 16px; font-weight: 700; }
  .kitchen-ticket-kitchen-label { font-size: 11px; letter-spacing: 0.08em; margin-top: 4px; }
  .kitchen-ticket-rule { border-top: 1px dashed #999; margin: 10px 0; }
  .kitchen-ticket-section { margin: 0; }
  .kitchen-ticket-order-number { font-size: 18px; font-weight: 700; }
  .kitchen-ticket-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
  .kitchen-ticket-meta { font-size: 12px; color: #444; margin-top: 2px; }
  .kitchen-ticket-value { font-size: 14px; margin-top: 2px; }
  .kitchen-ticket-items { list-style: none; }
  .kitchen-ticket-item { margin: 6px 0; }
  .kitchen-ticket-item-row { display: flex; gap: 8px; }
  .kitchen-ticket-qty { font-weight: 700; min-width: 2ch; }
  .kitchen-ticket-item-name { flex: 1; }
  .kitchen-ticket-notes { font-size: 13px; margin-top: 4px; white-space: pre-wrap; }
  .kitchen-ticket-subtotal-row,
  .kitchen-ticket-total-row-main { display: flex; justify-content: space-between; margin-top: 4px; font-size: 13px; }
  .kitchen-ticket-total-row-main { font-size: 15px; font-weight: 700; margin-top: 8px; }
  .kitchen-ticket-payment { font-size: 12px; margin-top: 8px; }
  @media print {
    body { padding: 0; }
  }
`;

export type KitchenTicketPrintResult =
  | { ok: true; method: "print" }
  | { ok: false; cancelled?: boolean; message: string };

let printInFlight = false;

function getTicketHtmlDocument(): string | null {
  const source = document.querySelector<HTMLElement>("[data-testid='kitchen-ticket-print']");
  const ticketHtml = source?.querySelector(".kitchen-ticket")?.outerHTML;
  if (!ticketHtml) return null;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>Kitchen Ticket</title><style>${TICKET_PRINT_STYLES}</style></head><body>${ticketHtml}</body></html>`;
}

/**
 * Isolated iframe print so the dialog only contains the ticket (not the dashboard chrome).
 * Preferred over Web Share of an HTML file, which never shows a real print sheet.
 */
function printViaIframe(html: string): Promise<KitchenTicketPrintResult> {
  return new Promise((resolve) => {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", "Kitchen Ticket Print");
    iframe.setAttribute("aria-hidden", "true");
    Object.assign(iframe.style, {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "0",
      height: "0",
      border: "0",
      opacity: "0",
      pointerEvents: "none",
    });
    document.body.appendChild(iframe);

    let settled = false;
    const finish = (result: KitchenTicketPrintResult) => {
      if (settled) return;
      settled = true;
      window.setTimeout(() => iframe.remove(), 1000);
      resolve(result);
    };

    const win = iframe.contentWindow;
    const doc = iframe.contentDocument ?? win?.document;
    if (!win || !doc) {
      try {
        window.print();
        finish({ ok: true, method: "print" });
      } catch {
        finish({ ok: false, message: "Printing is not available in this browser." });
      }
      return;
    }

    const triggerPrint = () => {
      try {
        win.focus();
        win.print();
        finish({ ok: true, method: "print" });
      } catch {
        try {
          window.print();
          finish({ ok: true, method: "print" });
        } catch {
          finish({ ok: false, message: "Printing is not available in this browser." });
        }
      }
    };

    doc.open();
    doc.write(html);
    doc.close();
    window.setTimeout(triggerPrint, 50);
  });
}

async function printViaNativeAirPrint(html: string): Promise<KitchenTicketPrintResult> {
  try {
    const result = await KitchenPrinter.printHtml({
      html,
      jobName: "Kitchen Ticket",
    });
    if (result.cancelled) {
      return { ok: false, cancelled: true, message: "Print canceled." };
    }
    return { ok: true, method: "print" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/cancel|dismiss|abort/i.test(message)) {
      return { ok: false, cancelled: true, message: "Print canceled." };
    }
    return {
      ok: false,
      message: "Could not open the print dialog. Try again from this order.",
    };
  }
}

/**
 * Desktop / mobile web: print the ticket document in a hidden iframe.
 * Native Capacitor iOS: AirPrint via UIPrintInteractionController (not the share sheet).
 */
export async function printKitchenTicket(): Promise<KitchenTicketPrintResult> {
  if (printInFlight) {
    return { ok: false, message: "Print is already starting." };
  }

  printInFlight = true;
  try {
    const html = getTicketHtmlDocument();
    if (!html) {
      return { ok: false, message: "Kitchen ticket is not ready to print yet." };
    }

    if (isNativeApp()) {
      return await printViaNativeAirPrint(html);
    }

    return await printViaIframe(html);
  } finally {
    printInFlight = false;
  }
}
