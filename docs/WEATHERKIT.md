# WeatherKit setup

TownHub uses Apple WeatherKit as its single production weather provider. The API server calls the WeatherKit REST API; browser and iOS clients call TownHub's `/api/weather` endpoint.

## Required server configuration

Create a WeatherKit key and service identifier in the Apple Developer account, then configure these API-server environment variables:

- `WEATHERKIT_KEY_ID`
- `WEATHERKIT_TEAM_ID`
- `WEATHERKIT_SERVICE_ID`
- `WEATHERKIT_PRIVATE_KEY` or `WEATHERKIT_PRIVATE_KEY_PATH`
- `WEATHERKIT_LATITUDE`
- `WEATHERKIT_LONGITUDE`
- `WEATHERKIT_TIMEZONE` (for example, `America/New_York`)

WeatherKit accepts coordinates rather than a place-name query, so the latitude and longitude must match the configured `weatherLocation` label. Do not put the private key in the frontend bundle, source control, or logs.

WeatherKit requires Apple attribution wherever its weather data is displayed. TownHub displays “Weather by Apple” alongside the homepage weather card.

`GET /api/weather` preserves Apple's `conditionCode` values (for example, `Foggy`, `MostlyCloudy`, or `ScatteredThunderstorms`) and includes a readable `summary`. This makes the provider value easy to verify without exposing the private key: after deployment, open the endpoint in a browser and inspect `current.conditionCode` and each `daily[].conditionCode`. TownHub uses those values for its weather icon and friendly forecast sentence.

The API caches a WeatherKit response for up to 10 minutes. The active homepage refreshes weather every 10 minutes; reloading the page or returning focus to it may also fetch a newer response once the browser cache is stale.

If WeatherKit is not configured, development may use the existing demo fallback. Production returns an unavailable state and does not fabricate forecast data.
