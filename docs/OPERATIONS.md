# Operations

## Daily checks

Use `GET /health` for public uptime and Admin → System Status for authenticated service health, notification delivery, and job configuration. Monitor API/frontend availability, Stripe webhooks, database health, error reporting, backups, and scheduled jobs.

## Alerts and logs

The API writes structured logs and sends errors to Sentry when configured. Never log secrets, guest tokens, payment payloads, or unnecessary customer information. Treat a failed payment webhook, unavailable database, failed backup, or missed scheduled job as an operational alert.

## Scheduled work

`POST /api/internal/jobs/subscription-trial-reminders` requires `JOB_SECRET`. The deployment owner must configure its scheduler, set `JOB_CRON_CONFIGURED=true`, and investigate a missing or failed run from System Status.

## Recovery and incidents

- Backup/restore: [DATABASE_BACKUP_AND_RECOVERY.md](DATABASE_BACKUP_AND_RECOVERY.md)
- Security/privacy incident: [SECURITY_INCIDENT_RESPONSE.md](SECURITY_INCIDENT_RESPONSE.md)
- Account deletion: [ACCOUNT_DELETION_RUNBOOK.md](ACCOUNT_DELETION_RUNBOOK.md)
- Notification behavior: [NOTIFICATIONS.md](NOTIFICATIONS.md)

## Scaling limits

The in-process SSE bus supports one API instance only. List APIs lack pagination. These are planned engineering limits, not operational settings that can be changed at deploy time.
