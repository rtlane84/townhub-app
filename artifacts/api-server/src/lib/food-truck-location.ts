import { z } from "zod";

const nullableOptionalString = z.union([z.string(), z.null()]).optional();

function normalizeOptionalString(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

const optionalFieldKeys = [
  "address",
  "latitude",
  "longitude",
  "startTime",
  "endTime",
  "locationNotes",
] as const;

type OptionalFieldKey = (typeof optionalFieldKeys)[number];

export type LocationInput = {
  locationName: string;
  address?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  locationDate: string;
  startTime?: string | null;
  endTime?: string | null;
  locationNotes?: string | null;
  isActive: boolean;
};

export type LocationUpdateInput = Partial<LocationInput>;

function normalizeLocationFields<T extends Record<string, unknown>>(data: T): T {
  const normalized = { ...data };
  for (const key of optionalFieldKeys) {
    if (key in normalized) {
      (normalized as Record<OptionalFieldKey, string | null | undefined>)[key] =
        normalizeOptionalString(normalized[key] as string | null | undefined);
    }
  }
  return normalized;
}

function validateCoordinateFields(
  data: { latitude?: string | null; longitude?: string | null },
  ctx: z.RefinementCtx,
  validateWhenPartial: boolean,
) {
  const hasLatitudeKey = "latitude" in data;
  const hasLongitudeKey = "longitude" in data;
  if (validateWhenPartial && !hasLatitudeKey && !hasLongitudeKey) return;

  const lat = hasLatitudeKey ? (data.latitude ?? null) : null;
  const lng = hasLongitudeKey ? (data.longitude ?? null) : null;
  const hasLat = lat != null;
  const hasLng = lng != null;

  if (!hasLat && !hasLng) return;
  if (hasLat !== hasLng) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Provide both latitude and longitude, or leave both blank.",
      path: hasLat ? ["longitude"] : ["latitude"],
    });
    return;
  }

  const latNum = Number.parseFloat(lat!);
  const lngNum = Number.parseFloat(lng!);
  if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Latitude must be a number between -90 and 90.",
      path: ["latitude"],
    });
  }
  if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Longitude must be a number between -180 and 180.",
      path: ["longitude"],
    });
  }
}

const locationInputBaseSchema = z.object({
  locationName: z.string().min(1),
  address: nullableOptionalString,
  latitude: nullableOptionalString,
  longitude: nullableOptionalString,
  locationDate: z.string().min(1),
  startTime: nullableOptionalString,
  endTime: nullableOptionalString,
  locationNotes: nullableOptionalString,
  isActive: z.boolean().optional().default(true),
});

const locationCreateSchema = locationInputBaseSchema.superRefine((data, ctx) =>
  validateCoordinateFields(data, ctx, false),
);

const locationUpdateBaseSchema = locationInputBaseSchema.partial().superRefine((data, ctx) =>
  validateCoordinateFields(data, ctx, true),
);

export function parseLocationCreateInput(body: unknown) {
  const parsed = locationCreateSchema.safeParse(body);
  if (!parsed.success) return parsed;
  return {
    success: true as const,
    data: normalizeLocationFields(parsed.data) as LocationInput,
  };
}

export function parseLocationUpdateInput(body: unknown) {
  const parsed = locationUpdateBaseSchema.safeParse(body);
  if (!parsed.success) return parsed;
  return {
    success: true as const,
    data: normalizeLocationFields(parsed.data) as LocationUpdateInput,
  };
}
