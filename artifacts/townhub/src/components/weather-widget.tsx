import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function weatherIconForCode(code: number): LucideIcon {
  if (code === 0) return Sun;
  if (code <= 3) return CloudSun;
  if (code <= 48) return CloudFog;
  if (code <= 67) return CloudRain;
  if (code <= 77) return CloudSnow;
  if (code <= 86) return CloudSnow;
  if (code >= 95) return CloudLightning;
  return Cloud;
}

export function WeatherIcon({
  code,
  className,
}: {
  code: number;
  className?: string;
}) {
  const Icon = weatherIconForCode(code);
  return <Icon className={cn("shrink-0", className)} aria-hidden />;
}

function formatDayLabel(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  return parsed.toLocaleDateString(undefined, { weekday: "short" });
}

/** Compact weather body for dashboard cards. */
export function WeatherCardContent({
  locationLabel,
  current,
  daily,
}: {
  locationLabel: string;
  current: { temperatureF: number; weatherCode: number; summary: string };
  daily: Array<{ date: string; highF: number; lowF: number; weatherCode: number }>;
}) {
  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex min-w-0 items-start gap-2">
        <WeatherIcon code={current.weatherCode} className="mt-0.5 h-6 w-6 text-primary" />
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{locationLabel}</p>
          <p className="text-xl font-semibold text-foreground">
            {current.temperatureF}°{" "}
            <span className="text-sm font-normal text-muted-foreground">{current.summary}</span>
          </p>
        </div>
      </div>
      {daily.length > 0 && (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {daily.map((day) => (
            <div key={day.date} className="min-w-[2.75rem] shrink-0 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {formatDayLabel(day.date)}
              </p>
              <WeatherIcon code={day.weatherCode} className="mx-auto my-0.5 h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-medium text-foreground">{day.highF}°</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function WeatherUnavailableContent({ message }: { message: string }) {
  return <p className="text-sm text-muted-foreground">Weather unavailable — {message}</p>;
}

export function WeatherUnavailable({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-4xl rounded-xl border border-border/60 bg-white px-4 py-3 text-sm text-muted-foreground shadow-sm">
      Weather unavailable — {message}
    </div>
  );
}

export function WeatherWidget({
  locationLabel,
  current,
  daily,
}: {
  locationLabel: string;
  current: { temperatureF: number; weatherCode: number; summary: string };
  daily: Array<{ date: string; highF: number; lowF: number; weatherCode: number }>;
}) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-3 rounded-xl border border-border/60 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:gap-4">
      <WeatherCardContent locationLabel={locationLabel} current={current} daily={daily} />
    </div>
  );
}
