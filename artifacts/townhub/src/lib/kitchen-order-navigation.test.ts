import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const kitchenCardSource = readFileSync(
  new URL("../components/kitchen-order-card.tsx", import.meta.url),
  "utf8",
);

const orderDetailSource = readFileSync(
  new URL("../pages/dashboard/business/order-detail.tsx", import.meta.url),
  "utf8",
);

const kitchenTicketPrintSource = readFileSync(
  new URL("../components/kitchen-ticket-print.tsx", import.meta.url),
  "utf8",
);

describe("kitchen-order-card navigation", () => {
  it("opens business order detail when the card is activated", () => {
    assert.match(kitchenCardSource, /businessOrderDetailPath\(order\.id\)/);
    assert.match(kitchenCardSource, /onClick=\{openOrderDetail\}/);
    assert.match(kitchenCardSource, /aria-label=\{`Open \$\{ticketLabel\} details`\}/);
    assert.match(kitchenCardSource, /touch-pan-y/);
  });

  it("stops propagation on status action buttons so card navigation does not fire", () => {
    assert.match(kitchenCardSource, /event\.stopPropagation\(\)/);
    assert.match(kitchenCardSource, /onAdvance\(order\.id, quickAction\.nextStatus\)/);
  });
});

describe("business order detail heading", () => {
  it("shows short ticket number with reference subtext", () => {
    assert.match(
      orderDetailSource,
      /formatOrderTicketNumber\(order\.id, "Order", order\.businessOrderNumber\)/,
    );
    assert.match(orderDetailSource, /formatOrderReferenceLabel\(order\.orderNumber\)/);
  });
});

describe("kitchen ticket print", () => {
  it("prints short ticket number with optional reference line", () => {
    assert.match(
      kitchenTicketPrintSource,
      /formatOrderTicketNumber\(order\.id, "Ticket", order\.businessOrderNumber\)/,
    );
    assert.match(kitchenTicketPrintSource, /formatOrderReferenceLabel\(order\.orderNumber\)/);
  });

  it("uses Capacitor Share on native instead of relying on window.print alone", () => {
    assert.match(kitchenTicketPrintSource, /@capacitor\/share/);
    assert.match(kitchenTicketPrintSource, /@capacitor\/filesystem/);
    assert.match(kitchenTicketPrintSource, /shareTicketOnNative/);
    assert.match(kitchenTicketPrintSource, /cancelled/);
  });
});
