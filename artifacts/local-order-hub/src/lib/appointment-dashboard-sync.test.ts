import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AppointmentRequest } from "@workspace/api-client-react";
import {
  appointmentListsEqual,
  detectAppointmentListChanges,
  isAlertableNewAppointmentRequest,
} from "./appointment-dashboard-sync.ts";

function request(overrides: Partial<AppointmentRequest> & Pick<AppointmentRequest, "id">): AppointmentRequest {
  return {
    businessId: 1,
    customerName: "Alex",
    requestedDate: "2026-06-24",
    requestedTime: "14:00",
    status: "NEW",
    source: "CUSTOMER",
    ...overrides,
  };
}

describe("appointment-dashboard-sync", () => {
  it("detectAppointmentListChanges finds new and updated requests", () => {
    const previous = [request({ id: 1 }), request({ id: 2, status: "CONFIRMED" })];
    const next = [
      request({ id: 3 }),
      request({ id: 2, status: "COMPLETED" }),
      request({ id: 1 }),
    ];

    const changes = detectAppointmentListChanges(previous, next);
    assert.deepEqual(changes.newRequestIds, [3]);
    assert.deepEqual(changes.updatedRequestIds, [2]);
    assert.equal(changes.hasChanges, true);
  });

  it("appointmentListsEqual compares row signatures", () => {
    const a = [request({ id: 1 }), request({ id: 2, status: "CONFIRMED" })];
    const b = [request({ id: 1 }), request({ id: 2, status: "CONFIRMED" })];
    const c = [request({ id: 1 }), request({ id: 2, status: "COMPLETED" })];

    assert.equal(appointmentListsEqual(a, b), true);
    assert.equal(appointmentListsEqual(a, c), false);
  });

  it("isAlertableNewAppointmentRequest only alerts on customer NEW requests", () => {
    assert.equal(isAlertableNewAppointmentRequest(request({ id: 1 })), true);
    assert.equal(
      isAlertableNewAppointmentRequest(request({ id: 2, source: "MANUAL", status: "CONFIRMED" })),
      false,
    );
    assert.equal(
      isAlertableNewAppointmentRequest(request({ id: 3, status: "CONFIRMED" })),
      false,
    );
  });
});
