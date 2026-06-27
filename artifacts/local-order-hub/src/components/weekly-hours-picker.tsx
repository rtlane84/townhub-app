import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  DAY_LABELS,
  normalizeWeeklyHours,
} from "@workspace/api-zod";
import type { BusinessDayHours } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

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
                <Input
                  type="time"
                  value={day.openTime ?? "09:00"}
                  onChange={(e) => updateDay(day.dayOfWeek, { openTime: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Closes</Label>
                <Input
                  type="time"
                  value={day.closeTime ?? "17:00"}
                  onChange={(e) => updateDay(day.dayOfWeek, { closeTime: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
