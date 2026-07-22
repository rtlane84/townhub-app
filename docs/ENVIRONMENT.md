# Environment

`.env.example` is the complete safe template. Copy it to `.env` locally; never commit real values.

## `.env.example` reference

| Variable | Used by | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | API, Drizzle | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | API | Server-side identity verification |
| `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY` | API, frontend | Clerk client configuration |
| `VITE_CLERK_PROXY_URL` | Frontend | Optional Clerk proxy URL |
| `SESSION_SECRET` | API | Signs guest order and checkout access tokens; required in production |
| `APP_BASE_URL` | API | Public web URL for redirects and notification links |
| `PORT`, `NODE_ENV` | API | Runtime listener and production behavior |
| `STRIPE_SECRET_KEY` | API | Stripe API access for Connect orders and Billing |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | API | Verifies connected-account order/refund webhooks |
| `STRIPE_PLATFORM_WEBHOOK_SECRET` | API | Verifies platform Billing webhooks |
| `STRIPE_WEBHOOK_SECRET` | API | Legacy general webhook secret; do not substitute it for the two domain-specific secrets above |
| `RESEND_API_KEY`, `RESEND_FROM` | API | Transactional email delivery and sender address |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` | API | SMS delivery |
| `NTFY_SERVER_URL` | API | Optional development/mobile notification relay |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` | API | Media storage; service role key is server-only |
| `SENTRY_DSN`, `VITE_SENTRY_DSN` | API, frontend | Error reporting; the frontend DSN is intentionally public configuration |
| `JOB_SECRET` | API and scheduler | Authenticates the scheduled-jobs endpoint |
| `PLATFORM_ADMIN_EMAIL` | API | Bootstrap/operational admin address |

## Deployment and browser configuration

`DEPLOYMENT_ENVIRONMENT` identifies staging or production. `VITE_API_BASE_URL`, `VITE_PUBLIC_WEB_URL`, and `VITE_DISTRIBUTION_CHANNEL` are build-time frontend values; change them before building. `CORS_ALLOWED_ORIGINS` and `NATIVE_ALLOWED_ORIGINS` define permitted production clients. These deployment-only values are not in `.env.example` because their correct values differ by environment; document them in the hosting-provider secret/configuration record.

## Providers

| Area | Variables | Required when enabled |
| --- | --- | --- |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_CONNECT_WEBHOOK_SECRET`, `STRIPE_PLATFORM_WEBHOOK_SECRET` | Card checkout or subscriptions |
| Media | `SUPABASE_URL`, service role key, bucket | Production uploads |
| Email | Resend values or SMTP values | Email delivery |
| SMS | `TWILIO_*` | SMS delivery |
| Monitoring | `SENTRY_DSN`, `VITE_SENTRY_DSN` | Error reporting |
| Jobs | `JOB_SECRET`, `JOB_CRON_CONFIGURED` | Scheduled subscription reminders |
| Weather | `WEATHERKIT_*` | Homepage weather |

Detailed provider setup remains in the focused Stripe, Resend, Twilio, WeatherKit, and iOS guides.

## Rules

- Store real secrets only in local ignored files or hosting-provider secrets.
- Do not expose server-only values through `VITE_*` variables.
- Run `pnpm run release:check-env` for the target release environment before deployment.
- Update `.env.example` and this document whenever a variable is added, removed, or changes meaning.
