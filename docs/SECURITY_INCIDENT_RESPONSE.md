# Security and privacy incident response

Use this runbook for suspected unauthorized access, data disclosure, credential loss, payment-webhook compromise, or material service abuse. It complements [SECURITY.md](../SECURITY.md), [DEPLOYMENT.md](DEPLOYMENT.md), and [ACCOUNT_DELETION_RUNBOOK.md](ACCOUNT_DELETION_RUNBOOK.md).

## First hour

1. Create a private incident record with time discovered, reporter, systems, data categories, scope, and assigned owner. Do not place customer PII, guest tokens, Stripe data, or secrets in public tickets or chat.
2. Contain safely: revoke exposed API/provider keys, disable compromised user/business access, pause affected webhook handling or ordering if integrity is uncertain, and preserve relevant audit logs.
3. Verify the facts: affected identities, order/payment impact, whether data was encrypted, and whether an unauthorized party accessed or acquired it. Keep a time-stamped decision log.
4. Escalate to the platform owner, security contact, counsel, insurer, and payment/identity providers as applicable. Do not promise a notification deadline or public cause before counsel confirms the legal obligation.

## Investigation and recovery

1. Rotate credentials, remediate the root cause, add focused tests, and review access logs and provider dashboards.
2. Reconcile orders, refunds, Stripe events, notifications, and any interrupted data writes before resuming normal operation.
3. Restore only from a known-good backup and follow [DATABASE_BACKUP_AND_RECOVERY.md](DATABASE_BACKUP_AND_RECOVERY.md); never overwrite production while investigating.
4. Counsel determines whether WV breach notification or other reporting is required. If notification is required, use approved notice content, documented recipient lists, and the applicable timeline.

## Aftercare

- Record containment, impact, notification decisions, remediation, and the evidence used.
- Conduct an access review and a blameless retrospective within 10 business days.
- Update the data inventory, vendor register, retention rules, tests, and this runbook when the incident reveals a gap.

## Minimum quarterly review

- Confirm production access is least-privilege and remove former staff/contractors.
- Review provider DPA/security terms for Clerk, Stripe, hosting, database, storage, email, SMS, notifications, analytics, and monitoring.
- Validate backup history and complete a restore drill on the documented schedule.
- Test this response process with a tabletop exercise.
