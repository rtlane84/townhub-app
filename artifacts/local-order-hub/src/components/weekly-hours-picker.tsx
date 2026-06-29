import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DAY_LABELS,
  isEndTimeAfterStart,
  normalizeWeeklyHours,
} from "@workspace/api-zod";
import type { BusinessDayHours } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { TimePicker } from "@/components/time-picker";

type WeeklyHoursPickerProps = {
  value: BusinessDayHours[];
  onChange: (value: BusinessDayHours[]) => void;
  className?: string;
};

export function WeeklyHoursPicker({ value, onChange, className }: WeeklyHoursPickerProps) {
  const schedule = normalizeWeeklyHours(value);

  function updateDay(dayOfWeek: number, patch: Partial<BusinessDayHours>) {
    onChange(
      schedule.map((day) =>
        day.dayOfWeek === dayOfWeek ? { ...day, ...patch } : day,
      ),
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {schedule.map((day) => (
        <div
          key={day.dayOfWeek}
          className="rounded-lg border border-border/60 px-3 py-3 bg-background space-y-3"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">{DAY_LABELS[day.dayOfWeek]}</span>
            <div className="flex items-center gap-2">
              <Switch
                id={`hours-open-${day.dayOfWeek}`}
                checked={!day.isClosed}
                onCheckedChange={(open) =>
                  updateDay(day.dayOfWeek, {
                    isClosed: !open,
                    openTime: open ? (day.openTime ?? "09:00") : null,
                    closeTime: open ? (day.closeTime ?? "17:00") : null,
                  })
                }
              />
              <Label htmlFor={`hours-open-${day.dayOfWeek}`} className="text-xs text-muted-foreground">
                {day.isClosed ? "Closed" : "Open"}
              </Label>
            </div>
          </div>

          {!day.isClosed && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Opens</Label>
                <TimePicker
                  value={day.openTime ?? "09:00"}
                  onChange={(openTime) => updateDay(day.dayOfWeek, { openTime })}
                  data-testid={`hours-open-time-${day.dayOfWeek}`}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Closes</Label>
                <TimePicker
                  value={day.closeTime ?? "17:00"}
                  onChange={(closeTime) => updateDay(day.dayOfWeek, { closeTime })}
                  min={day.openTime ?? undefined}
                  error={
                    day.openTime && day.closeTime && !isEndTimeAfterStart(day.openTime, day.closeTime)
                      ? "Must close after opening"
                      : undefined
                  }
                  data-testid={`hours-close-time-${day.dayOfWeek}`}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
