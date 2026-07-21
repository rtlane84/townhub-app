import type { WeatherForecast } from "@workspace/api-client-react";
import {
  WeatherIcon,
  WeatherUnavailableContent,
} from "@/components/weather-widget";
import { buildWeatherOutlookMessage } from "@/lib/weather-outlook";
import { cn } from "@/lib/utils";

type HomeWelcomeSectionProps = {
  greeting: string;
  firstName?: string | null;
  isSignedIn: boolean;
  placeLabel: string;
  weatherEnabled: boolean;
  weather: WeatherForecast | undefined;
  weatherError: boolean;
  weatherLoading: boolean;
};

function CompactWeatherCard({
  weatherEnabled,
  weather,
  weatherError,
  weatherLoading,
}: Pick<
  HomeWelcomeSectionProps,
  "weatherEnabled" | "weather" | "weatherError" | "weatherLoading"
>) {
  if (!weatherEnabled) return null;

  if (weatherLoading) {
    return (
      <div
        className="h-[4.75rem] w-[6.5rem] shrink-0 animate-pulse rounded-2xl border border-black/[0.04] bg-card shadow-sm"
        aria-hidden
      />
    );
  }

  if (weather?.enabled && weather.current) {
    const today = weather.daily?.[0];
    return (
      <div
        className="flex w-[6.5rem] shrink-0 flex-col items-center self-start rounded-2xl border border-black/[0.04] bg-card px-2.5 py-2 text-center shadow-[0_2px_12px_-6px_rgba(15,23,42,0.12)]"
        aria-label={`Weather: ${weather.current.temperatureF} degrees, ${weather.current.summary}`}
      >
        <WeatherIcon
          code={weather.current.weatherCode}
          className="h-5 w-5 text-amber-500"
        />
        <p className="mt-0.5 text-lg font-bold leading-none tracking-tight text-platform-heading">
          {Math.round(weather.current.temperatureF)}°
        </p>
        <p className="mt-0.5 line-clamp-1 text-[10px] font-medium text-muted-foreground">
          {weather.current.summary}
        </p>
        {today ? (
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            H: {Math.round(today.highF)}° L: {Math.round(today.lowF)}°
          </p>
        ) : null}
        <p className="mt-0.5 text-[8px] text-muted-foreground">Weather by Apple</p>
      </div>
    );
  }

  if (weather?.unavailable || weatherError) {
    return (
      <div className="w-[6.5rem] shrink-0 self-start rounded-2xl border border-black/[0.04] bg-card px-2.5 py-2 shadow-sm">
        <WeatherUnavailableContent
          message={weather?.message ?? "Unable to load weather right now."}
        />
      </div>
    );
  }

  return null;
}

export function HomeWelcomeSection({
  greeting,
  firstName,
  isSignedIn,
  placeLabel,
  weatherEnabled,
  weather,
  weatherError,
  weatherLoading,
}: HomeWelcomeSectionProps) {
  const name = isSignedIn && firstName ? firstName : null;
  const outlook =
    weatherEnabled && !weatherLoading
      ? buildWeatherOutlookMessage(weather, { placeLabel })
      : null;

  return (
    <section className="th-fade-up">
      {/* Row stays horizontal on normal iPhone widths; stack only on extremely narrow screens */}
      <div
        className={cn(
          "flex items-start gap-3",
          weatherEnabled ? "flex-row justify-between" : "flex-col",
          "max-[320px]:flex-col max-[320px]:items-stretch",
        )}
      >
        <div className="min-w-0 flex-1 pr-1">
          <p className="truncate text-[13px] font-medium text-muted-foreground">
            {name ? `${greeting}, ${name} 👋` : `${greeting} 👋`}
          </p>
          <h1 className="mt-1 max-w-[16.5rem] text-[1.3rem] font-bold leading-[1.25] tracking-tight text-platform-heading xs:max-w-none sm:text-[1.45rem] sm:max-w-[22rem]">
            Here&apos;s what&apos;s happening in {placeLabel} today.
          </h1>
        </div>
        <CompactWeatherCard
          weatherEnabled={weatherEnabled}
          weather={weather}
          weatherError={weatherError}
          weatherLoading={weatherLoading}
        />
      </div>

      {outlook ? (
        <p className="mt-2.5 text-[13px] leading-snug text-muted-foreground">
          {outlook}
        </p>
      ) : null}
      {weather?.alert?.summary ? (
        <div className="mt-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] leading-snug text-red-900">
          <span className="font-semibold">Weather alert:</span>{" "}
          {weather.alert.summary}
        </div>
      ) : null}
    </section>
  );
}
