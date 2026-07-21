import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildWeatherOutlookMessage,
  filterEventsThisWeek,
} from "./weather-outlook.ts";
import type { WeatherForecast } from "@workspace/api-client-react";

function forecast(
  partial: Partial<WeatherForecast> & {
    daily: NonNullable<WeatherForecast["daily"]>;
  },
): WeatherForecast {
  return {
    enabled: true,
    current: {
      temperatureF: 71,
      weatherCode: 2,
      summary: "Partly cloudy",
    },
    ...partial,
  };
}

describe("buildWeatherOutlookMessage", () => {
  it("returns null when forecast is unavailable", () => {
    assert.equal(buildWeatherOutlookMessage(undefined), null);
    assert.equal(
      buildWeatherOutlookMessage({
        enabled: true,
        unavailable: true,
        message: "fail",
      }),
      null,
    );
  });

  it("prioritizes storms and does not repeat partly cloudy", () => {
    const now = new Date("2026-07-12T15:00:00");
    const msg = buildWeatherOutlookMessage(
      forecast({
        daily: [
          {
            date: "2026-07-12",
            highF: 83,
            lowF: 64,
            weatherCode: 95,
            summary: "Thunderstorm",
          },
        ],
      }),
      { placeLabel: "Clay", now },
    );
    assert.ok(msg);
    assert.match(msg!, /Storms may move through Clay/);
    assert.doesNotMatch(msg!, /Partly cloudy/i);
  });

  it("mentions heat when highs are extreme", () => {
    const now = new Date("2026-07-12T10:00:00");
    const msg = buildWeatherOutlookMessage(
      forecast({
        daily: [
          {
            date: "2026-07-12",
            highF: 95,
            lowF: 72,
            weatherCode: 0,
            summary: "Clear",
          },
        ],
      }),
      { now },
    );
    assert.equal(msg, "Temperatures may reach 95° today.");
  });

  it("does not call a cloudy day sunny just because it is hot", () => {
    const now = new Date("2026-07-12T15:00:00");
    const msg = buildWeatherOutlookMessage(
      forecast({
        current: { temperatureF: 83, weatherCode: 3, summary: "Mostly cloudy" },
        daily: [
          {
            date: "2026-07-12",
            highF: 91,
            lowF: 71,
            weatherCode: 3,
            summary: "Mostly cloudy",
            precipitationChance: 20,
          },
        ],
      }),
      { now },
    );
    assert.notEqual(msg, "Expect a warm and sunny afternoon.");
  });

  it("mentions likely rain before using a temperature fallback", () => {
    const now = new Date("2026-07-12T15:00:00");
    const msg = buildWeatherOutlookMessage(
      forecast({
        daily: [
          {
            date: "2026-07-12",
            highF: 83,
            lowF: 71,
            weatherCode: 3,
            summary: "Mostly cloudy",
            precipitationChance: 70,
          },
        ],
      }),
      { now },
    );
    assert.equal(msg, "Rain is likely today—keep an umbrella nearby.");
  });

  it("suggests dry weather when today and tomorrow are clear of rain", () => {
    const now = new Date("2026-07-12T11:00:00");
    const msg = buildWeatherOutlookMessage(
      forecast({
        current: { temperatureF: 70, weatherCode: 1, summary: "Mainly clear" },
        daily: [
          {
            date: "2026-07-12",
            highF: 78,
            lowF: 58,
            weatherCode: 1,
            summary: "Mainly clear",
          },
          {
            date: "2026-07-13",
            highF: 80,
            lowF: 60,
            weatherCode: 0,
            summary: "Clear",
          },
        ],
      }),
      { now },
    );
    assert.equal(msg, "Dry weather is expected through tomorrow.");
  });
});

describe("filterEventsThisWeek", () => {
  it("keeps events that overlap the current week", () => {
    const now = new Date("2026-07-12T12:00:00"); // Sunday
    const events = [
      { id: 1, date: "2026-07-12" },
      { id: 2, date: "2026-07-18" },
      { id: 3, date: "2026-07-19" },
    ];
    const week = filterEventsThisWeek(events, now);
    assert.deepEqual(
      week.map((e) => e.id),
      [1, 2],
    );
  });
});
