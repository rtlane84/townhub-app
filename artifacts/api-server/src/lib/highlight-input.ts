import { z } from "zod";

/** Empty / whitespace strings clear nullable highlight fields on write. */
const optionalNullableString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

export const highlightInputSchema = z.object({
  title: z.string().min(1),
  description: optionalNullableString,
  imageUrl: optionalNullableString,
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  relatedBusinessId: z.number().int().nullable().optional(),
  buttonText: optionalNullableString,
  buttonUrl: optionalNullableString,
  active: z.boolean().optional().default(true),
  sortOrder: z.number().int().optional().default(0),
});

export type HighlightInputParsed = z.infer<typeof highlightInputSchema>;
