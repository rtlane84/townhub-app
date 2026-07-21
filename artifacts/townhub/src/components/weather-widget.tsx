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

export function weatherIconForCondition(conditionCode: string): LucideIcon {
  switch (conditionCode) {
    case "Clear":
    case "MostlyClear":
      return Sun;
    case "PartlyCloudy":
    case "MostlyCloudy":
      return CloudSun;
    case "Foggy":
    case "Haze":
    case "Smoky":
      return CloudFog;
    case "Drizzle":
    case "FreezingDrizzle":
    case "Rain":
    case "HeavyRain":
    case "Showers":
    case "SunShowers":
    case "FreezingRain":
    case "Hurricane":
    case "TropicalStorm":
      return CloudRain;
    case "Flurries":
    case "Sleet":
    case "Snow":
    case "SunFlurries":
    case "WintryMix":
    case "Blizzard":
    case "BlowingSnow":
    case "HeavySnow":
      return CloudSnow;
    case "IsolatedThunderstorms":
    case "ScatteredThunderstorms":
    case "StrongStorms":
    case "Thunderstorms":
      return CloudLightning;
    case "Cloudy":
      return Cloud;
    default:
      return Cloud;
  }
}

export function WeatherIcon({
  conditionCode,
  className,
}: {
  conditionCode: string;
  className?: string;
}) {
  const Icon = weatherIconForCondition(conditionCode);
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
  current: { temperatureF: number; conditionCode: string; summary: string };
  daily: Array<{ date: string; highF: number; lowF: number; conditionCode: string }>;
}) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <WeatherIcon conditionCode={current.conditionCode} className="mt-0.5 h-8 w-8 text-primary" />
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{locationLabel}</p>
          <p className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground">
            {current.temperatureF}°
          </p>
          <p className="text-sm text-muted-foreground">{current.summary}</p>
        </div>
      </div>
      {daily.length > 0 && (
        <div className="flex gap-2.5 overflow-x-auto hide-scrollbar pt-1">
          {daily.map((day) => (
            <div key={day.date} className="min-w-[2.85rem] shrink-0 text-center">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {formatDayLabel(day.date)}
              </p>
              <WeatherIcon conditionCode={day.conditionCode} className="mx-auto my-1 h-4 w-4 text-muted-foreground" />
              <p className="text-xs font-semibold text-foreground">{day.highF}°</p>
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
  current: { temperatureF: number; conditionCode: string; summary: string };
  daily: Array<{ date: string; highF: number; lowF: number; conditionCode: string }>;
}) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-3 rounded-xl border border-border/60 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:gap-4">
      <WeatherCardContent locationLabel={locationLabel} current={current} daily={daily} />
    </div>
  );
}
