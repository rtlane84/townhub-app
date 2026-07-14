import { useEffect, useId, useRef, useState } from "react";
import { useLookupUsZip, getLookupUsZipQueryKey } from "@workspace/api-client-react";
import {
  composeStreetAddress,
  isCompleteStreetAddress,
  normalizeUsZipForLookup,
  parseStreetAddress,
  type StreetAddressParts,
} from "@workspace/api-zod";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";

type StreetAddressFieldsProps = {
  value: string;
  onChange: (composed: string) => void;
  required?: boolean;
  disabled?: boolean;
  streetId?: string;
  zipId?: string;
  streetLabel?: string;
  zipLabel?: string;
  streetPlaceholder?: string;
  className?: string;
  "data-testid"?: string;
};

function partsEqual(a: StreetAddressParts, b: StreetAddressParts): boolean {
  return (
    a.street === b.street &&
    a.city === b.city &&
    a.state === b.state &&
    a.zip === b.zip
  );
}

export function StreetAddressFields({
  value,
  onChange,
  required = false,
  disabled = false,
  streetId,
  zipId,
  streetLabel = "Street address",
  zipLabel = "ZIP code",
  streetPlaceholder = "123 Main St, Apt 4",
  className,
  "data-testid": testId,
}: StreetAddressFieldsProps) {
  const autoId = useId();
  const resolvedStreetId = streetId ?? `${autoId}-street`;
  const resolvedZipId = zipId ?? `${autoId}-zip`;

  const [parts, setParts] = useState<StreetAddressParts>(() => parseStreetAddress(value));
  const lastEmitted = useRef(composeStreetAddress(parseStreetAddress(value)));

  // Rehydrate when parent value changes from outside (edit forms / clear).
  useEffect(() => {
    if (value === lastEmitted.current) return;
    const parsed = parseStreetAddress(value);
    setParts((current) => (partsEqual(current, parsed) ? current : parsed));
    lastEmitted.current = composeStreetAddress(parsed);
  }, [value]);

  function emit(next: StreetAddressParts) {
    setParts(next);
    const composed = composeStreetAddress(next);
    lastEmitted.current = composed;
    if (composed !== value) onChange(composed);
  }

  function updateParts(updater: (current: StreetAddressParts) => StreetAddressParts) {
    setParts((current) => {
      const next = updater(current);
      if (partsEqual(current, next)) return current;
      const composed = composeStreetAddress(next);
      lastEmitted.current = composed;
      if (composed !== value) onChange(composed);
      return next;
    });
  }

  const debouncedZip = useDebouncedValue(parts.zip, 300);
  const lookupKey = normalizeUsZipForLookup(debouncedZip) ?? "";
  const {
    data: zipLookup,
    isFetching,
    isError,
    isFetched,
  } = useLookupUsZip(lookupKey, {
    query: {
      enabled: lookupKey.length === 5,
      queryKey: getLookupUsZipQueryKey(lookupKey),
      retry: false,
      staleTime: 7 * 24 * 60 * 60 * 1000,
    },
  });

  useEffect(() => {
    if (!lookupKey) {
      updateParts((current) =>
        current.city || current.state ? { ...current, city: "", state: "" } : current,
      );
      return;
    }
    if (zipLookup) {
      updateParts((current) => {
        if (
          current.city === zipLookup.city &&
          current.state === zipLookup.state &&
          normalizeUsZipForLookup(current.zip) === zipLookup.zip
        ) {
          return current;
        }
        return {
          ...current,
          zip: zipLookup.zip,
          city: zipLookup.city,
          state: zipLookup.state,
        };
      });
      return;
    }
    if (isFetched && isError) {
      updateParts((current) =>
        current.city || current.state ? { ...current, city: "", state: "" } : current,
      );
    }
  }, [lookupKey, zipLookup, isFetched, isError]);

  const showIncomplete =
    required &&
    (parts.street.trim().length > 0 || parts.zip.trim().length > 0) &&
    !isCompleteStreetAddress(parts);
  const zipHint = !lookupKey
    ? "Enter a ZIP to fill city and state."
    : isFetching
      ? "Looking up city and state…"
      : zipLookup
        ? `${zipLookup.city}, ${zipLookup.state}`
        : isFetched
          ? "ZIP code not found."
          : "Enter a ZIP to fill city and state.";

  return (
    <div className={cn("space-y-3", className)} data-testid={testId}>
      <div className="space-y-1.5">
        <Label htmlFor={resolvedStreetId}>
          {streetLabel}
          {required ? <span className="text-destructive"> *</span> : null}
        </Label>
        <Input
          id={resolvedStreetId}
          value={parts.street}
          onChange={(e) => emit({ ...parts, street: e.target.value })}
          placeholder={streetPlaceholder}
          autoComplete="street-address"
          disabled={disabled}
          required={required}
          data-testid={testId ? `${testId}-street` : undefined}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-[8rem_1fr] sm:items-start">
        <div className="space-y-1.5">
          <Label htmlFor={resolvedZipId}>
            {zipLabel}
            {required ? <span className="text-destructive"> *</span> : null}
          </Label>
          <Input
            id={resolvedZipId}
            value={parts.zip}
            onChange={(e) =>
              emit({
                ...parts,
                zip: e.target.value,
                city: "",
                state: "",
              })
            }
            placeholder="25043"
            inputMode="numeric"
            autoComplete="postal-code"
            disabled={disabled}
            required={required}
            maxLength={10}
            data-testid={testId ? `${testId}-zip` : undefined}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-muted-foreground">City / State</Label>
          <p
            className={cn(
              "flex min-h-9 items-center rounded-md border border-input bg-muted/40 px-3 text-sm",
              zipLookup ? "text-foreground" : "text-muted-foreground",
            )}
            data-testid={testId ? `${testId}-locality` : undefined}
          >
            {zipHint}
          </p>
        </div>
      </div>

      {showIncomplete ? (
        <p className="text-xs text-destructive">
          Enter a street address and a valid ZIP so city and state can be filled in.
        </p>
      ) : null}
    </div>
  );
}
