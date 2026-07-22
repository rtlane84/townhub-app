# TownHub Business Outreach Kit

Use this copy with the print handout and [business sales page](https://townhub.io/for-businesses). The standard call to action is: **Apply at townhub.io/list-your-business**.

## First-contact email or text

Hi [First name] - I am building TownHub for Clay businesses. It gives local customers one place to find your hours, services or menu, and how to contact or order from you. You can start with a simple business page or add online ordering when it makes sense. It is $20/month for Business Showcase or $40/month for Business Ordering, and both start with a 14-day trial. There is no setup fee or TownHub platform transaction fee. Would you be open to a quick look? You can also apply here: https://townhub.io/list-your-business

## 60-second in-person script

"I am building TownHub to help Clay customers find and support businesses like yours. It is a simple local page for your hours, photos, menu or services, and contact details - something more dependable than hoping people see a social-media post. If you take appointments, customers can request one for you to confirm. If you sell products, the Ordering plan also lets customers place pickup or delivery orders that you manage from your own dashboard. You stay in control of your business and fulfillment; TownHub is not a POS replacement or a delivery fleet. The Showcase plan is $20 a month, Ordering is $40, and both have a 14-day trial. There is no setup fee. Would you like to see the page or start an application?"

## Follow-up (send 2-3 days after a visit)

Hi [First name] - it was good meeting you at [business name]. I wanted to share the TownHub link we discussed: https://townhub.io/for-businesses. A Business Showcase page is $20/month ($200/year), while Business Ordering is $40/month ($400/year) for businesses that want local pickup or delivery orders. Both include a 14-day trial. Applying takes about two minutes: https://townhub.io/list-your-business. I am happy to help with your hours, photos, menu, or services if you would rather set it up together.

## Owner onboarding checklist

Bring these items to make setup quick:

- Business name, category, street address, phone number, and email.
- Logo and 3-5 representative photos.
- Regular hours, holiday/temporary-hour notes, and a short business description.
- Menu, product list, service list, categories, prices, and any pickup instructions.
- Whether you accept appointment requests; these remain requests until you confirm them.
- For food trucks, pop-ups, or traveling businesses: today's location and upcoming schedule.
- For Business Ordering: pickup/delivery availability, delivery area, minimum, fee, preparation estimate, and payment choices.
- For card payments: complete Stripe Connect onboarding after approval. Stripe processing fees apply to card payments; TownHub charges no platform transaction fee.

## Production pilot go-live (Clay)

Run this only after production web (`townhub.io`) and the production-API iOS build are green. Do not copy staging test businesses into production.

### Operator prep

- [ ] Confirm [LEGAL_LAUNCH.md](./LEGAL_LAUNCH.md) gates you intend to honor for the pilot (seller agreement env, counsel/CPA status).
- [ ] Production admin claimed via `/setup` (or already present); Admin → Operations Center healthy.
- [ ] `BUSINESS_SELLER_AGREEMENT_APPROVED_VERSION` set in production when counsel has approved the published agreement.
- [ ] Production Stripe live keys + Connect/Billing webhooks pointing at `https://api.townhub.io/api/checkout/webhook`.
- [ ] Resend (and Twilio if used) verified with production sender identities; send one test email/SMS.
- [ ] Sentry/uptime alerts reaching you; [PRODUCTION.md](../PRODUCTION.md) rollback path bookmarked.

### First businesses (target ≥5 across ≥3 types)

For each pilot owner:

1. They apply at https://townhub.io/list-your-business (or you assist in person with the outreach kit above).
2. Admin reviews identity, contact, hours, catalog readiness, and seller-agreement acceptance → approve.
3. Owner signs in → Business Hub → complete profile, hours, photos, catalog.
4. Ordering plan: enable pickup/delivery rules; finish Stripe Connect before card checkout.
5. Place one controlled test order (pay-at-pickup and/or card) and confirm owner notification + kitchen/status flow.
6. Confirm subscription path on **web** (store builds suppress billing CTAs; use Manage on the web).

### After first live order

- Watch Sentry and Railway logs for 24h.
- Keep staging (`staging.townhub.io`) for continued QA; never point pilot phones at staging builds.
- Record cohort names and activation dates outside git (company records), not in this repo.

## Offer guardrails

- **Business Showcase:** $20/month or $200/year; 14-day trial; business page/catalog, appointment requests, mobile schedule, email notifications, and analytics. It does not include online ordering.
- **Business Ordering:** $40/month or $400/year; 14-day trial; everything in Business Showcase plus online ordering, order management, and SMS notifications.
- Do not promise instant appointment bookings, TownHub-managed delivery, POS replacement, waived Stripe fees, or guaranteed customer volume.
