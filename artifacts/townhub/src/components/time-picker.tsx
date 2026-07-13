import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatTime12h,
  isEndTimeAfterStart,
  normalizeOptionalTime,
  parseTimeToHHmm,
  TIME_INPUT_STEP_SECONDS,
} from "@workspace/api-zod";
import { cn } from "@/lib/utils";

type TimePickerProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  optional?: boolean;
  min?: string;
  max?: string;
  disabled?: boolean;
  className?: string;
  error?: string;
  showFriendlyHint?: boolean;
  "data-testid"?: string;
};

export function TimePicker({
  id,
  value,
  onChange,
  required = false,
  optional = false,
  min,
  max,
  disabled = false,
  className,
  error,
  showFriendlyHint = true,
  "data-testid": testId,
}: TimePickerProps) {
  const normalized = normalizeOptionalTime(value);
  const rangeError =
    min && normalized && !isEndTimeAfterStart(min, normalized)
      ? "Must be after start time"
      : undefined;
  const displayError = error ?? rangeError;

  return (
    <div className="space-y-1">
      <Input
        id={id}
        type="time"
        step={TIME_INPUT_STEP_SECONDS}
        value={normalized}
        onChange={(e) => onChange(e.target.value)}
        required={required && !optional}
        min={min}
        max={max}
        disabled={disabled}
        className={cn(
          "h-9 w-full min-w-0 max-w-full text-sm",
          displayError && "border-destructive focus-visible:ring-destructive",
          className,
        )}
        data-testid={testId}
      />
      {showFriendlyHint && normalized && (
        <p className="text-xs text-muted-foreground">{formatTime12h(normalized)}</p>
      )}
      {displayError && <p className="text-xs text-destructive">{displayError}</p>}
    </div>
  );
}

type TimeRangePickerProps = {
  startValue: string;
  endValue: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  startLabel?: string;
  endLabel?: string;
  optional?: boolean;
  startId?: string;
  endId?: string;
  startTestId?: string;
  endTestId?: string;
  /** Always two columns (good for compact mobile forms). */
  alwaysTwoColumns?: boolean;
  showFriendlyHint?: boolean;
  className?: string;
};

export function TimeRangePicker({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  startLabel = "Start Time",
  endLabel = "End Time",
  optional = true,
  startId,
  endId,
  startTestId,
  endTestId,
  alwaysTwoColumns = false,
  showFriendlyHint = true,
  className,
}: TimeRangePickerProps) {
  const start = normalizeOptionalTime(startValue);
  const end = normalizeOptionalTime(endValue);
  const endError =
    start && end && !isEndTimeAfterStart(start, end)
      ? "End time must be after start time"
      : undefined;

  return (
    <div
      className={cn(
        "grid gap-3",
        alwaysTwoColumns ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2 sm:gap-4",
        className,
      )}
    >
      <div className="min-w-0 space-y-1.5">
        <Label htmlFor={startId} className="text-sm font-medium">
          {startLabel}
        </Label>
        <TimePicker
          id={startId}
          value={startValue}
          onChange={onStartChange}
          optional={optional}
          className="h-11"
          showFriendlyHint={showFriendlyHint}
          data-testid={startTestId}
        />
      </div>
      <div className="min-w-0 space-y-1.5">
        <Label htmlFor={endId} className="text-sm font-medium">
          {endLabel}
        </Label>
        <TimePicker
          id={endId}
          value={endValue}
          onChange={onEndChange}
          optional={optional}
          min={start || undefined}
          error={endError}
          className="h-11"
          showFriendlyHint={showFriendlyHint}
          data-testid={endTestId}
        />
      </div>
    </div>
  );
}

/** Parses legacy stored values when loading forms. */
export function coerceFormTime(value: unknown): string {
  return parseTimeToHHmm(value) ?? "";
}
