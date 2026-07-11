import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canTransitionAppointmentStatus,
  appointmentStatusLabel,
  isTerminalAppointmentStatus,
} from "@workspace/api-zod";
import { buildCustomerAppointmentStatusEmail } from "./notification-content.ts";

describe("appointment status transitions", () => {
  it("allows owner to confirm or decline a new request", () => {
    assert.equal(canTransitionAppointmentStatus("NEW", "CONFIRMED"), true);
    assert.equal(canTransitionAppointmentStatus("NEW", "DECLINED"), true);
    assert.equal(canTransitionAppointmentStatus("NEW", "COMPLETED"), false);
  });

  it("allows completing or cancelling a confirmed appointment", () => {
    assert.equal(canTransitionAppointmentStatus("CONFIRMED", "COMPLETED"), true);
    assert.equal(canTransitionAppointmentStatus("CONFIRMED", "CANCELLED"), true);
  });

  it("blocks changes after terminal states", () => {
    assert.equal(canTransitionAppointmentStatus("DECLINED", "CONFIRMED"), false);
    assert.equal(isTerminalAppointmentStatus("COMPLETED"), true);
    assert.equal(appointmentStatusLabel("NEW"), "New request");
  });
});

describe("customer appointment status email", () => {
  it("confirms the appointment is not auto-booked on decline", () => {
    const email = buildCustomerAppointmentStatusEmail({
      businessName: "Main St Salon",
      customerName: "Jamie",
      serviceName: "Haircut",
      requestedDate: "2026-07-01",
      requestedTime: "14:30",
      status: "DECLINED",
      statusNote: "Fully booked that day",
    });
    assert.match(email.subject, /update/i);
    assert.match(email.text, /unable to confirm/i);
    assert.match(email.text, /Fully booked that day/);
    assert.match(email.html, /Not confirmed/i);
    assert.match(email.html, /request only/i);
  });

  it("uses clear confirmed wording", () => {
    const email = buildCustomerAppointmentStatusEmail({
      businessName: "Main St Salon",
      customerName: "Jamie",
      requestedDate: "2026-07-01",
      requestedTime: "14:30",
      status: "CONFIRMED",
    });
    assert.match(email.subject, /confirmed/i);
    assert.match(email.text, /confirmed your appointment request/i);
    assert.match(email.html, /Confirmed/);
  });
});
