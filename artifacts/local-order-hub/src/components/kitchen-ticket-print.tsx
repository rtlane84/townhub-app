import type { Order } from "@workspace/api-client-react";
import {
  formatKitchenFulfillment,
  formatKitchenPaymentStatus,
  formatKitchenTicketTime,
  parseKitchenSpecialFields,
} from "@/lib/kitchen-ticket-format";
import { resolveDisplayedOrderTotals } from "@/lib/order-totals-display";

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

  return (
    <div className="kitchen-ticket-print hidden print:block" data-testid="kitchen-ticket-print">
      <article className="kitchen-ticket" aria-label={`Kitchen ticket for order ${order.orderNumber ?? order.id}`}>
        <header className="kitchen-ticket-header">
          <p className="kitchen-ticket-business">{order.businessName}</p>
          <p className="kitchen-ticket-kitchen-label">KITCHEN TICKET</p>
        </header>

        <TicketRule />

        <section className="kitchen-ticket-section">
          <p className="kitchen-ticket-order-number">{order.orderNumber ?? `#${order.id}`}</p>
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

export function printKitchenTicket(): void {
  window.print();
}
