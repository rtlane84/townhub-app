# Storefront Entitlement Audit — August 12, 2026

This is a read-only snapshot of the staging and production subscription, plan-feature, and storefront-mode state. No environment data was changed during this audit.

## Expected action rules

- `ORDERING` plus an effective `online_ordering` feature: **Order** / **Order Now**.
- `APPOINTMENT` plus an effective `appointment_requests` feature: **Book** / **Book Now**.
- Any unsupported or `INFORMATION` mode: directory **Visit**, no large storefront CTA.
- A restricted paid subscription is not publicly listed and has no effective plan features.
- Business Basic is complimentary and contains only `mobile_business`; it never exposes ordering, appointments, or a catalog.

## Production

| ID | Business | Type | Saved mode | Plan / status | Effective features | Expected public action | Finding |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 11 | Clay Royalty Cheer Athletics | Recreation | INFORMATION | Business Basic / ACTIVE | mobile_business | Visit | Correct |
| 12 | Proforma 3rd Degree Marketing | Service provider | INFORMATION | Business Basic / ACTIVE | mobile_business | Visit | Correct |
| 13 | Blazing Saddles L.L.C | Service provider | INFORMATION | Business Basic / ACTIVE | mobile_business | Visit | Correct |
| 14 | Buck’s Buddies | General | INFORMATION | Business Basic / ACTIVE | mobile_business | Visit | Correct |
| 15 | Destiney’s Skin Haven LLC | Salon | INFORMATION | Business Basic / ACTIVE | mobile_business | Visit | Correct |
| 16 | Coal Dust and Chrome.,LLC | Salon | INFORMATION | Business Basic / ACTIVE | mobile_business | Visit | Correct |
| 17 | Designs By Lexi | Salon | INFORMATION | Business Basic / ACTIVE | mobile_business | Visit | Correct |
| 18 | TC Treats LLC | Food vendor | ORDERING | Business Basic / ACTIVE | mobile_business | Visit | **Saved mode is unsupported** |

## Staging

| ID | Business | Type | Saved mode | Plan / status | Effective features | Expected public action | Finding |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Legacy Foods | Food vendor | INFORMATION | Business Showcase / ACTIVE | business_website, mobile_business | Visit | Correct for current staging mapping |
| 3 | Dunkin | Food vendor | ORDERING | Business Showcase / CANCELED | none | Not publicly listed | **Saved mode is unsupported** |
| 6 | I need coffee | Coffee shop | ORDERING | Business Showcase / ACTIVE | business_website, mobile_business | Visit | **Saved mode is unsupported** |
| 8 | Joes Muggs | Coffee shop | ORDERING | Business Ordering / ACTIVE | appointment_requests, business_website, email_notifications, mobile_business, online_ordering, sms_notifications | Order | Correct |
| 9 | Jack and Jill | Grocery | ORDERING | Business Ordering / ACTIVE | appointment_requests, business_website, email_notifications, mobile_business, online_ordering, sms_notifications | Order | Correct |
| 10 | Duck Donuts | Bakery | ORDERING | Business Ordering / ACTIVE | appointment_requests, business_website, email_notifications, mobile_business, online_ordering, sms_notifications | Order | Correct |
| 11 | Krispy Kreme | Salon | INFORMATION | Business Basic / ACTIVE | mobile_business | Visit | Correct; salon category does not imply booking |
| 12 | Main Street Tea | Coffee shop | ORDERING | Business Ordering / ACTIVE | appointment_requests, business_website, email_notifications, mobile_business, online_ordering, sms_notifications | Order | Correct |
| 13 | Test Business | Coffee shop | ORDERING | Founders / BETA | analytics, appointment_requests, business_website, email_notifications, mobile_business, online_ordering, sms_notifications | Order | Correct |
| 16 | Kung Fu Java | Coffee shop | INFORMATION | Business Basic / ACTIVE | mobile_business | Visit | Correct |
| 18 | Julie’s Quiet Coffee & Cozy Chapters | Coffee shop | ORDERING | Business Ordering / INCOMPLETE | none | Not publicly listed | **Saved mode is unsupported** |
| 19 | Cake, cake, cake | Bakery | ORDERING | Business Ordering / ACTIVE | appointment_requests, business_website, email_notifications, mobile_business, online_ordering, sms_notifications | Order | Correct |
| 22 | Joe’s pool hall | Recreation | ORDERING | Business Showcase / INCOMPLETE | none | Not publicly listed | **Saved mode is unsupported** |
| 23 | ManTech | Food vendor | INFORMATION | Business Basic / TRIAL | mobile_business | Visit | Current state is correct; screenshot reflects earlier salon/appointment state |

## Plan-feature drift

The repository launch definitions currently expect:

- Business Showcase: `analytics`, `appointment_requests`, `business_website`, `email_notifications`, `mobile_business`.
- Business Ordering: all Showcase features plus `online_ordering` and `sms_notifications`.
- Business Basic: `mobile_business` only (confirmed product assumption; maintained outside the launch-plan bootstrap helper).

| Environment | Plan | Current difference from repository definition |
| --- | --- | --- |
| Staging | Business Basic | None |
| Staging | Business Showcase | Missing `analytics`, `appointment_requests`, and `email_notifications` |
| Staging | Business Ordering | Missing `analytics` |
| Production | Business Basic | None |
| Production | Business Showcase | Missing `analytics` and `email_notifications` |
| Production | Business Ordering | Missing `analytics` |

Do not change these paid-plan mappings until the repository definitions are reconfirmed as the intended commercial packaging. The storefront fix fails closed under either mapping.

## Review-only correction statements

These statements are prepared for review and were **not executed**. Run them only against the named environment after a fresh backup and explicit production-data authorization.

### Existing saved-mode corrections

Production:

```sql
UPDATE businesses
SET storefront_mode = 'INFORMATION'
WHERE id = 18
  AND slug = 'tc-treats-llc'
  AND storefront_mode = 'ORDERING';
```

Staging:

```sql
UPDATE businesses
SET storefront_mode = 'INFORMATION'
WHERE id IN (3, 6, 18, 22)
  AND storefront_mode = 'ORDERING';
```

### Optional plan-feature alignment

Only use these if the repository launch definitions above are confirmed as authoritative.

Production:

```sql
INSERT INTO plan_features (plan_id, feature_id)
SELECT 2, id
FROM subscription_features
WHERE key IN ('analytics', 'email_notifications')
ON CONFLICT DO NOTHING;

INSERT INTO plan_features (plan_id, feature_id)
SELECT 3, id
FROM subscription_features
WHERE key = 'analytics'
ON CONFLICT DO NOTHING;
```

Staging:

```sql
INSERT INTO plan_features (plan_id, feature_id)
SELECT 2, id
FROM subscription_features
WHERE key IN ('analytics', 'appointment_requests', 'email_notifications')
ON CONFLICT DO NOTHING;

INSERT INTO plan_features (plan_id, feature_id)
SELECT 3, id
FROM subscription_features
WHERE key = 'analytics'
ON CONFLICT DO NOTHING;
```

After any authorized correction, verify the public business payloads and rerun the storefront-mode reconciliation tests before deployment.
