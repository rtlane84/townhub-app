import {
  normalizeOptionalTime,
  normalizeRequiredTime,
  isEndTimeAfterStart,
} from "../../../../lib/api-zod/src/time.ts";

export type EventSubmitEventType =
  | "COMMUNITY"
  | "FOOD_TRUCK"
  | "SEASONAL"
  | "SALE"
  | "HOLIDAY"
  | "MARKET"
  | "OTHER";

export type EventSubmitFormValues = {
  title: string;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: string;
  description: string;
  eventType: EventSubmitEventType;
  submitterName: string;
  submitterEmail: string;
  /** Honeypot — leave empty. */
  website: string;
};

export type EventSubmitField =
  | "title"
  | "date"
  | "endDate"
  | "startTime"
  | "endTime"
  | "submitterName"
  | "submitterEmail";

export type EventSubmitFieldErrors = Partial<Record<EventSubmitField, string>>;

export const BLANK_EVENT_SUBMIT: EventSubmitFormValues = {
  title: "",
  date: "",
  endDate: "",
  startTime: "",
  endTime: "",
  location: "",
  description: "",
  eventType: "COMMUNITY",
  submitterName: "",
  submitterEmail: "",
  website: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEventSubmitForm(
  values: EventSubmitFormValues,
): EventSubmitFieldErrors {
  const errors: EventSubmitFieldErrors = {};
  const title = values.title.trim();
  const date = values.date.trim();
  const endDate = values.endDate.trim();
  const startTime = normalizeRequiredTime(values.startTime);
  const endTime = normalizeOptionalTime(values.endTime);
  const name = values.submitterName.trim();
  const email = values.submitterEmail.trim();

  if (!title) errors.title = "Enter an event title.";
  if (!date) errors.date = "Choose a start date.";
  if (!startTime) errors.startTime = "Choose a start time.";
  if (!name) errors.submitterName = "Enter your name.";
  if (!email) errors.submitterEmail = "Enter your email.";
  else if (!EMAIL_PATTERN.test(email)) {
    errors.submitterEmail = "Enter a valid email address.";
  }

  if (endDate && date && endDate < date) {
    errors.endDate = "End date must be on or after the start date.";
  }

  if (endTime && startTime && !isEndTimeAfterStart(startTime, endTime)) {
    errors.endTime = "End time must be after the start time.";
  }

  return errors;
}

/** Build API payload. Empty optional strings become undefined. */
export function buildEventSubmitPayload(values: EventSubmitFormValues) {
  const startTime = normalizeRequiredTime(values.startTime);
  if (!startTime) {
    throw new Error("Start time is required");
  }
  const endTime = normalizeOptionalTime(values.endTime) || undefined;
  const endDate = values.endDate.trim() || undefined;

  return {
    title: values.title.trim(),
    date: values.date.trim(),
    endDate,
    startTime,
    endTime,
    location: values.location.trim() || undefined,
    description: values.description.trim() || undefined,
    eventType: values.eventType || ("COMMUNITY" as const),
    submitterName: values.submitterName.trim(),
    submitterEmail: values.submitterEmail.trim(),
    website: values.website || "",
  };
}

export function clearEventSubmitFieldError(
  errors: EventSubmitFieldErrors,
  field: EventSubmitField,
): EventSubmitFieldErrors {
  if (!(field in errors)) return errors;
  const next = { ...errors };
  delete next[field];
  return next;
}
