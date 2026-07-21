import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDemoWeatherForecast, weatherKitConditionLabel } from "./weather";

describe("WeatherKit condition handling", () => {
  it("keeps the provider condition distinct while formatting a readable label", () => {
    assert.equal(weatherKitConditionLabel("ScatteredThunderstorms"), "Scattered Thunderstorms");
    assert.equal(weatherKitConditionLabel("FreezingRain"), "Freezing Rain");
  });

  it("uses native WeatherKit-style conditions in demo data", () => {
    const forecast = buildDemoWeatherForecast("Clay, WV");
    assert.equal(forecast.current.conditionCode, "PartlyCloudy");
    assert.equal(forecast.current.summary, "Partly Cloudy");
  });
});
