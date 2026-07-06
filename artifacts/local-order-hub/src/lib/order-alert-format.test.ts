import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

describe("order and appointment alert formatting", () => {
  it("defines actionable toast and consolidated banner copy", async () => {
    const orderFormat = await readFile(new URL("./order-alert-format.ts", import.meta.url), "utf8");
    const appointmentFormat = await readFile(
      new URL("./appointment-alert-format.ts", import.meta.url),
      "utf8",
    );

    assert.match(orderFormat, /orderToastTitle/);
    assert.match(orderFormat, /orderToastBody/);
    assert.match(orderFormat, /orderBannerHeadline\(order: Order, totalCount: number\)/);
    assert.match(orderFormat, /New Orders Waiting/);
    assert.match(orderFormat, /🔔 New/);

    assert.match(appointmentFormat, /appointmentToastTitle/);
    assert.match(appointmentFormat, /appointmentBannerHeadline\(request: AppointmentRequest, totalCount: number\)/);
    assert.match(appointmentFormat, /New Appointments Waiting/);
  });
});
