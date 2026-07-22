# TownHub Product Requirements Document

**Product:** TownHub  
**Category:** Multi-tenant local commerce SaaS and community marketplace  
**Stage:** Beta / production readiness  
**Document status:** Working product baseline  
**Last updated:** July 13, 2026

---

## 1. Product Summary

TownHub is a local commerce platform that gives a town or county one digital destination for discovering businesses, ordering products, requesting appointments, following food trucks, and finding community events.

Participating businesses receive a hosted storefront and an operations hub for managing their presence, catalog, orders, appointments, notifications, locations, and subscription. The TownHub operator receives a platform administration system for onboarding businesses, managing plans and community content, monitoring operations, and governing the marketplace.

TownHub is not intended to replace every specialized business system. Its purpose is to give small local businesses a simple, affordable way to become discoverable and transact online without building and maintaining independent websites and apps.

### Product promise

**For residents:** Find and support local businesses in one trusted place.  
**For businesses:** Get online, accept local business, and manage daily activity without technical overhead.  
**For the platform operator:** Launch and operate a sustainable local digital marketplace from one system.

---

## 2. Problem Statement

Small-town commerce is fragmented across social media pages, outdated websites, phone calls, paper menus, and word of mouth. Residents often do not know what is available locally, whether a business is open, or how to place an order. Small businesses frequently lack the time, expertise, or budget to operate their own modern commerce stack.

Existing marketplace products are often optimized for national delivery networks, charge high transaction fees, weaken the direct relationship between a business and its customers, or do not accommodate the variety of local businesses found in one community.

TownHub addresses this gap with a locally branded, multi-business platform that supports several operating models:

- product ordering for pickup or local delivery;
- pay online or pay at pickup;
- appointment requests for service businesses;
- information-only storefronts;
- food-truck schedules and location-based pickup;
- seasonal promotions, events, and community discovery.

---

## 3. Vision and Objectives

### Vision

Become the default digital front door for local commerce in a town or county.

### Beta objectives

1. Prove that a resident can reliably discover a business and complete a local order or appointment request.
2. Prove that a business owner can set up and operate their TownHub presence primarily from a phone.
3. Prove that the platform operator can onboard, support, bill, and monitor businesses without engineering intervention.
4. Validate that participating businesses receive enough customer activity or operational value to pay for TownHub.
5. Establish a secure and observable production foundation before expanding to additional towns.

### Non-goals for beta

- Becoming a nationwide marketplace.
- Supporting carts containing products from multiple businesses.
- Providing full inventory, accounting, payroll, CRM, or ERP functionality.
- Providing route optimization or a platform-managed delivery fleet.
- Providing instant calendar booking with staff/resource scheduling.
- Replacing a business's existing point-of-sale system.
- Building separate native feature implementations when the responsive web experience is sufficient.

---

## 4. Target Market

### Initial market

Independent businesses and residents in Clay, the first pilot locality, operated by a local TownHub administrator.

### Initial business segments

- Restaurants, cafes, bakeries, caterers, and food trucks.
- Florists and seasonal flower businesses.
- Greenhouses, farm stands, markets, and small grocers.
- Retail and gift stores.
- Salons, barbers, repair shops, and other service providers.
- Building-supply and quote/request-oriented businesses.
- Funeral and memorial service providers.
- Information-only community businesses.

### Expansion model

TownHub should first demonstrate repeatable onboarding and retention in Clay. The long-term product is intended for many localities, but geographic expansion and locality-level tenancy are post-validation work, not beta requirements.

---

## 5. Users and Personas

### 5.1 Resident / Customer

**Goal:** Quickly find a trusted local business and complete an order or request with confidence.

**Needs:**

- Browse without creating an account.
- Understand whether a business is open and what services it supports.
- See accurate products, prices, availability, hours, and fulfillment options.
- Check out with minimal friction.
- Receive confirmation and meaningful status updates.
- Find prior orders when signed in.

### 5.2 Business Owner or Manager

**Goal:** Maintain an accurate storefront and handle incoming customer activity with minimal effort.

**Needs:**

- Use the Business Hub from a phone, tablet, or desktop.
- Manage only authorized businesses.
- Update products, availability, hours, and fulfillment settings.
- Notice new orders and appointment requests immediately.
- Move work through clear operational states.
- Understand subscription and payment status.
- Receive actionable warnings when payments or configuration require attention.

### 5.3 Platform Administrator

**Goal:** Operate a healthy local marketplace and grow recurring revenue.

**Needs:**

- Review and approve business applications.
- Manage businesses, owners, plans, features, and subscriptions.
- Curate events, highlights, and featured businesses.
- View cross-platform activity and operational health.
- Investigate notification, payment, and system failures.
- Disable unsafe or inactive accounts and enforce platform access.

### 5.4 Guest Customer

A guest customer is a resident who checks out without creating an account. Guest checkout is a primary conversion path, not a degraded exception. Guest order details must remain protected by signed access tokens.

---

## 6. Product Principles

1. **Local first:** Town identity, local discovery, and direct business relationships should remain visible throughout the experience.
2. **Mobile operational simplicity:** A business owner should be able to complete common daily tasks from a phone.
3. **Trust over feature volume:** Accurate availability, secure access, dependable payments, and clear confirmations matter more than adding breadth.
4. **One business per transaction:** Each order belongs to one business, simplifying fulfillment, payment ownership, tax, refunds, and accountability.
5. **Flexible storefronts:** Businesses should enable only the capabilities matching how they operate.
6. **Configuration instead of code:** Plans, trials, feature access, branding, and business modes should be manageable by administrators.
7. **Graceful provider degradation:** Missing optional delivery providers may produce logged notifications in development, but must never create false production success.
8. **Server-enforced tenancy:** UI hiding is not authorization. Business ownership, platform roles, feature access, and inactive states must be enforced by the API.

---

## 7. Core User Journeys

### 7.1 Discover and order as a guest

1. Resident lands on the TownHub homepage.
2. Resident searches, filters, or opens a featured business.
3. Resident reviews hours, fulfillment availability, products, and business information.
4. Resident adds products from one business to the cart.
5. Resident selects an available pickup or delivery option and supplies required details.
6. Resident pays online through the business's connected Stripe account or selects pay at pickup when enabled.
7. TownHub displays a protected confirmation and sends a confirmation notification.
8. Business receives the order and updates its status.
9. Customer receives meaningful status updates.

### 7.2 Request an appointment

1. Resident opens an appointment-enabled service storefront.
2. Resident selects or enters the requested service, preferred date/time, and contact details.
3. Business receives the request.
4. Business confirms or declines it.
5. Customer receives the decision and next-step information.

Appointments are requests during beta; the platform does not promise real-time slot availability.

### 7.3 Onboard a business

1. Prospective owner opens **List Your Business**.
2. Owner submits business details and selects an available plan.
3. Platform administrator receives an application alert.
4. Administrator reviews, approves, rejects, or requests correction outside the platform.
5. On approval, TownHub creates or activates the business, assigns ownership, and attaches the selected or default plan.
6. Trial or paid subscription state begins according to plan configuration.
7. Owner completes storefront, fulfillment, notification, and payment setup.
8. Administrator activates the business when launch requirements are satisfied.

### 7.4 Fulfill an order

1. Owner receives a new-order alert.
2. Owner opens the Business Hub order or kitchen view.
3. Owner accepts and progresses the order through the relevant statuses.
4. Customer receives selected lifecycle notifications.
5. Owner marks the order completed or performs an authorized cancellation/refund.
6. TownHub records the operational and payment outcome for audit and support.

### 7.5 Operate the marketplace

1. Administrator reviews platform health and recent activity.
2. Administrator manages applications, businesses, users, plans, and feature availability.
3. Administrator curates events and seasonal highlights.
4. Administrator investigates failed notifications, payments, jobs, and business configuration warnings.
5. Administrator takes corrective action without accessing customer information beyond legitimate operational need.

---

## 8. Functional Requirements

Priority definitions:

- **P0:** Required for a safe beta launch.
- **P1:** Required for a strong commercial release.
- **P2:** Valuable after initial product-market validation.

### 8.1 Public marketplace

| ID | Priority | Requirement |
|---|---|---|
| MKT-01 | P0 | Display active businesses in a responsive public directory. |
| MKT-02 | P0 | Support search by business name and filtering by business type. |
| MKT-03 | P0 | Show open/closed state, supported fulfillment methods, short description, and business branding. |
| MKT-04 | P0 | Provide stable, human-readable storefront URLs. |
| MKT-05 | P0 | Exclude inactive businesses from public ordering and appointment actions. |
| MKT-06 | P1 | Feature selected businesses and current seasonal highlights on the homepage (admin curation — not a paid plan add-on at Clay launch). |
| MKT-07 | P1 | Display upcoming community events in chronological order. |
| MKT-08 | P1 | Display current and upcoming food-truck locations with map actions. |
| MKT-09 | P2 | Add location-aware discovery and distance sorting. |

### 8.2 Storefront and catalog

| ID | Priority | Requirement |
|---|---|---|
| CAT-01 | P0 | Display business identity, contact information, hours, status, fulfillment options, and operating instructions. |
| CAT-02 | P0 | Display available products grouped by category with name, description, price, image, and availability. |
| CAT-03 | P0 | Support configurable product options and modifier groups where applicable. |
| CAT-04 | P0 | Prevent purchase of unavailable products and ordering outside server-enforced availability rules. |
| CAT-05 | P0 | Support ordering, appointment, information-only, and relevant food-truck storefront modes. |
| CAT-06 | P1 | Support featured products and business-specific promotional banner text. |
| CAT-07 | P2 | Support inventory quantities and low-stock alerts after validating merchant demand. |

### 8.3 Cart, checkout, and payments

| ID | Priority | Requirement |
|---|---|---|
| ORD-01 | P0 | Limit each cart and order to one business. |
| ORD-02 | P0 | Preserve the cart locally across ordinary navigation and refreshes. |
| ORD-03 | P0 | Collect customer contact details and fulfillment-specific information. |
| ORD-04 | P0 | Show only fulfillment methods enabled by the selected business. |
| ORD-05 | P0 | Enforce business minimums, delivery fees, tax, preparation estimates, and ordering availability on the server. |
| ORD-06 | P0 | Support Stripe Connect card checkout using direct charges on the selected business account. |
| ORD-07 | P0 | Support pay at pickup only when enabled by the business. |
| ORD-08 | P0 | Create exactly one durable paid order despite webhook retries or confirmation retries. |
| ORD-09 | P0 | Protect guest order access and customer PII with expiring or signed access credentials. |
| ORD-10 | P0 | Give owners/admins authorized order status, cancellation, and refund controls. |
| ORD-11 | P1 | Provide signed-in customers with order history and detail views. |
| ORD-12 | P2 | Provide an optional server-backed cart for cross-device continuity. |

### 8.4 Business Hub

| ID | Priority | Requirement |
|---|---|---|
| HUB-01 | P0 | Provide mobile-accessible navigation to all essential business functions. |
| HUB-02 | P0 | Allow an owner to access only businesses they own or are authorized to manage. |
| HUB-03 | P0 | Show actionable order and appointment queues with status and timing. |
| HUB-04 | P0 | Allow authorized catalog, category, modifier, and availability management. |
| HUB-05 | P0 | Allow management of identity, hours, storefront mode, ordering rules, fulfillment, and payment settings. |
| HUB-06 | P0 | Provide notification-channel configuration and test capabilities. |
| HUB-07 | P0 | Surface persistent Stripe/payment configuration warnings. |
| HUB-08 | P0 | Show the current subscription, trial, plan, and billing state. |
| HUB-09 | P1 | Refresh active operational views through live events with a polling fallback. |
| HUB-10 | P1 | Support food-truck location schedule management for eligible businesses. |
| HUB-11 | P1 | Provide revenue and operational summaries with clearly defined time ranges. |
| HUB-12 | P2 | Support additional staff roles and granular permissions. |

### 8.5 Appointments

| ID | Priority | Requirement |
|---|---|---|
| APT-01 | P0 | Allow appointment-enabled businesses to receive structured requests. |
| APT-02 | P0 | Allow an authorized owner to confirm or decline a request. |
| APT-03 | P0 | Notify the customer of the business's decision. |
| APT-04 | P1 | Allow owners to filter and manage upcoming requests efficiently. |
| APT-05 | P2 | Add reminders after notification reliability is validated. |
| APT-06 | P2 | Add real-time availability, staff, and resource scheduling only if research supports it. |

### 8.6 Notifications and live operations

| ID | Priority | Requirement |
|---|---|---|
| NTF-01 | P0 | Notify a business of new orders and appointment requests through its enabled operational channels. |
| NTF-02 | P0 | Send customers order confirmations and meaningful status changes. |
| NTF-03 | P0 | Log every attempted notification with channel, outcome, and diagnostic context that excludes secrets. |
| NTF-04 | P0 | Keep notification delivery asynchronous so provider failures do not fail the domain action. |
| NTF-05 | P0 | Include protected, usable deep links in guest customer notifications. |
| NTF-06 | P0 | Deliver mandatory critical payment alerts independently from optional marketing or operational preferences. |
| NTF-07 | P1 | Support APNs push for signed-in iOS users and remove invalid tokens automatically. |
| NTF-08 | P1 | Provide live Business Hub refresh without transmitting customer PII in events. |
| NTF-09 | P2 | Add web push and Android delivery after platform demand exists. |

### 8.7 Platform administration

| ID | Priority | Requirement |
|---|---|---|
| ADM-01 | P0 | Restrict all administrative operations to verified platform administrators. |
| ADM-02 | P0 | Manage business applications, businesses, activation, ownership, and users. |
| ADM-03 | P0 | View orders across businesses for legitimate support and platform operations. |
| ADM-04 | P0 | Create and manage subscription plans, trial length, pricing, setup fees, transaction fees, default status, and feature access. |
| ADM-05 | P0 | Assign or override a plan during application approval. |
| ADM-06 | P0 | View system health and notification-delivery history. |
| ADM-07 | P1 | Manage events, seasonal highlights, featured businesses, and platform theme. |
| ADM-08 | P1 | Display actionable payment, integration, and job health rather than only raw uptime. |
| ADM-09 | P2 | Support delegated administrator roles with narrower permissions. |

### 8.8 SaaS subscriptions

| ID | Priority | Requirement |
|---|---|---|
| SUB-01 | P0 | Allow applicants to select from active public plans. |
| SUB-02 | P0 | Apply the selected plan or the active default plan upon approval. |
| SUB-03 | P0 | Start and display trials according to plan configuration. |
| SUB-04 | P0 | Use Stripe Billing for production business subscriptions. |
| SUB-05 | P0 | Enforce plan features and inactive subscription states on the server. |
| SUB-06 | P0 | Keep customer order payments separate from TownHub subscription billing. |
| SUB-07 | P0 | Process billing webhooks idempotently and reflect the resulting state. |
| SUB-08 | P1 | Provide owners with self-service billing and plan-change actions where commercially appropriate. |
| SUB-09 | P1 | Notify owners and administrators of trial and payment lifecycle events. |

### 8.9 Mobile application

| ID | Priority | Requirement |
|---|---|---|
| MOB-01 | P1 | Deliver the responsive TownHub experience through a Capacitor iOS shell. |
| MOB-02 | P1 | Support safe-area layout, native navigation conventions, splash behavior, external browser flows, and deep links. |
| MOB-03 | P1 | Complete Clerk authentication and Stripe flows without trapping users in an unsupported WebView flow. |
| MOB-04 | P1 | Register devices for APNs and route notification taps to authorized destinations. |
| MOB-05 | P2 | Release an Android shell after iOS and responsive-web usage justify it. |

---

## 9. Business Rules

1. A customer cart and order may contain products from exactly one business.
2. A business must be active, authorized for the feature, and operationally available before accepting an order or appointment request.
3. Product prices are stored and exchanged as decimal currency values; clients must not reinterpret them as cents.
4. Online customer payments belong to the selected business's Stripe connected account.
5. TownHub subscription payments belong to the platform Stripe account and are a separate billing domain.
6. Guest customer PII is accessible only with a valid signed token or an authorized owner/admin/customer identity.
7. Business owners may mutate only businesses they are authorized to manage.
8. Platform feature gates and subscription entitlements must be enforced server-side.
9. Notification failure must be recorded but must not roll back a successfully completed order, appointment, or administrative action.
10. Refunds must produce an auditable record and remain idempotent across retries.
11. Public pages must not reveal inactive businesses, private operational data, payment identifiers, access tokens, or customer PII.
12. Development mock modes must be visibly distinguishable and unavailable in production.

---

## 10. Experience Requirements

### Accessibility

- Target WCAG 2.2 AA for public and dashboard experiences.
- All core workflows must be usable by keyboard.
- Inputs, errors, status changes, and dialogs must have accessible labels and announcements.
- Color must not be the only indicator of status.
- Touch targets must be suitable for mobile operational use.

### Responsive behavior

- Public discovery and checkout must work from 320px-wide mobile screens through desktop layouts.
- Business and admin navigation must never disappear without a mobile replacement.
- Kitchen/order interfaces should prioritize scanability, large actions, and minimal scrolling.

### Content and trust

- Clearly identify the business responsible for each order.
- Show the full price, fees, tax, fulfillment method, and payment method before confirmation.
- Avoid promising an appointment until the business confirms it.
- Use plain-language recovery guidance for closed stores, unavailable products, payment failures, and expired guest links.

### Performance targets

- Public pages should achieve a p75 Largest Contentful Paint below 2.5 seconds on representative mobile connections.
- User interactions should achieve p75 Interaction to Next Paint below 200 ms where feasible.
- API read endpoints used by core workflows should target p95 responses below 500 ms excluding third-party operations.
- Operational pages must remain usable when live updates fall back to polling.

---

## 11. Security, Privacy, and Reliability

### Security requirements

- Use Clerk-authenticated bearer tokens for protected API access.
- Apply explicit role and ownership middleware to every protected mutation and sensitive read.
- Rate-limit public and abuse-prone endpoints.
- Verify Stripe webhook signatures using raw request bodies.
- Store secrets only in the deployment secret manager.
- Validate all API inputs with generated or explicit Zod schemas.
- Scope uploaded media to the authorized business.
- Prevent logs, SSE payloads, analytics, and error reports from containing access tokens or unnecessary PII.

### Privacy requirements

- Collect only information required to fulfill an order, appointment, payment, or platform obligation.
- Document retention and deletion expectations before general availability.
- Restrict administrative access to customer information to operational support needs.
- Publish privacy, terms, refund, and merchant-responsibility policies before accepting live customer payments.

### Reliability requirements

- Core payment and webhook handlers must be idempotent.
- Database backups must run automatically and a restore drill must be completed before launch.
- Errors must be observable in Sentry with release information.
- Health checks must distinguish basic uptime from dependencies important to checkout and operations.
- A failed optional integration must degrade clearly without corrupting the core transaction.
- Multi-instance deployment must replace the in-process live-event bus with shared infrastructure or deliberately run a single API instance.

---

## 12. Analytics and Success Metrics

TownHub should instrument a minimal event taxonomy before beta. Analytics must avoid sensitive order details.

### North-star metric

**Successful local transactions or confirmed appointment requests per active business per week.**

### Acquisition and discovery

- Unique marketplace visitors.
- Business directory-to-storefront conversion rate.
- Storefront views per active business.
- Search success and zero-result rate.

### Customer conversion

- Storefront-to-cart rate.
- Checkout start-to-completion rate.
- Payment failure rate by reason.
- Guest versus authenticated checkout share.
- Repeat-customer rate within 30 and 90 days.

### Business activation and retention

- Application-to-approval time.
- Approval-to-activated-storefront time.
- Percentage of approved businesses completing catalog, fulfillment, notifications, and payment setup.
- Weekly active businesses.
- Trial-to-paid conversion rate.
- Monthly business churn.

### Operational quality

- Orders acknowledged within five minutes.
- Orders completed without administrator intervention.
- Notification delivery success by channel.
- Refund and cancellation rate.
- Appointment response time.
- Sev-1/Sev-2 incidents and mean time to recovery.

### Initial beta targets

Targets should be finalized with the first pilot cohort. Recommended starting hypotheses:

- At least 5 active pilot businesses across 3 business types.
- At least 80% of approved businesses launch without engineering assistance.
- At least 95% successful completion for valid checkout attempts excluding customer card declines.
- At least 95% of new-order alerts delivered or visibly surfaced within one minute.
- At least 90% of new orders acknowledged by the business within five minutes during configured operating hours.
- Zero unauthorized cross-business data access incidents.
- Zero unreconciled duplicate paid orders.

---

## 13. Launch Scope and Phasing

### Phase 0: Green baseline

Exit criteria:

- Typecheck, unit tests, API tests, frontend tests, E2E suite, and production build pass.
- Known authorization and guest-link gaps are fixed.
- Production configuration validation fails safely when required secrets are missing.
- The team can identify the deployed version and roll it back.

### Phase 1: Private operational pilot

Scope:

- 1–2 internal or closely supported businesses.
- Full catalog, checkout, notification, order-status, appointment, and refund exercises.
- Stripe test mode followed by one controlled live transaction.
- Production backup and restore drill.
- Direct observation of owners using phones during daily work.

Exit criteria:

- Every P0 journey succeeds end to end.
- No open critical or high-severity security finding.
- Owners can handle a new order without developer assistance.
- Failed payments and notifications are diagnosable from platform tools.

### Phase 2: Town beta

Scope:

- At least 5 businesses across food, retail/product, and service modes.
- Live subscription trials or agreed beta pricing.
- Public events/highlights and local launch marketing.
- Weekly metric and support review.

Exit criteria:

- Four consecutive weeks of reliable operations.
- Defined trial-to-paid conversion evidence.
- Support volume is manageable by the platform operator.
- The product demonstrates repeat resident usage or measurable merchant value.

### Phase 3: Commercial release

Scope:

- Self-service billing improvements.
- Operational analytics and refined onboarding.
- Pagination and scale work based on measured usage.
- iOS distribution if pilot usage supports it.
- Repeatable town-launch playbook.

### Phase 4: Expansion

Potential scope, subject to validation:

- Additional towns or tenant operators.
- Staff permissions.
- Shared live-event infrastructure for horizontal scaling.
- Server-backed carts.
- Web/Android push.
- Deeper POS, accounting, or calendar integrations.

---

## 14. Launch Acceptance Criteria

TownHub is ready for a controlled production beta only when all of the following are true:

### Customer

- A guest can discover an active business and complete both online-payment and pay-at-pickup flows when supported.
- Totals and fulfillment information remain consistent from cart through confirmation.
- Confirmation and status links open the correct protected order.
- Duplicate confirmation or webhook requests do not create duplicate orders.
- A customer can submit an appointment request and receive its decision.

### Business

- An owner can configure and operate a business from mobile and desktop.
- Unauthorized owners cannot view or mutate another business.
- New activity is surfaced reliably through configured notifications and the Business Hub.
- Order status, cancellation, and refund actions produce consistent customer and audit outcomes.
- A business cannot use plan-restricted features by calling the API directly.

### Platform

- An administrator can approve an application and activate a correctly owned, subscribed business.
- The platform can distinguish Stripe Connect order payments from Stripe Billing subscriptions.
- System health, notification logs, errors, and deployed release identity are visible.
- Backups and a documented restore procedure have been tested.
- Required legal pages, merchant terms, privacy disclosures, and support contact paths are published.

### Quality gates

```bash
pnpm run typecheck
pnpm --filter @workspace/api-server run test
pnpm --filter @workspace/townhub run test
pnpm run test:e2e
pnpm run build
```

All gates must pass against the release candidate or have a documented, time-limited exception approved by the product owner.

---

## 15. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Building too many business modes before validating demand | Delayed launch and inconsistent quality | Keep P0 workflows narrow; require customer or merchant evidence for new features. |
| Businesses fail to acknowledge orders | Poor customer trust | Multi-channel alerts, live operational views, onboarding rehearsal, and escalation guidance. |
| Incorrect tenant authorization | Severe privacy and trust failure | Server-side ownership guards, negative authorization tests, and security review. |
| Payment/webhook inconsistency | Duplicate or missing orders | Idempotency, durable pending checkout records, audit fields, and E2E Stripe testing. |
| Optional providers silently fail | Missed orders and support burden | Delivery logs, provider health checks, test actions, and visible production warnings. |
| Merchant setup is too complicated | Low activation and trial conversion | Guided checklist, sensible defaults, admin-assisted pilot onboarding, and activation metrics. |
| Multi-instance deployment breaks live updates | Stale owner dashboards | Single-instance beta constraint or shared pub/sub before horizontal scaling. |
| Local marketplace lacks demand density | Low customer value | Launch in one geography with a concentrated business cohort and coordinated marketing. |
| Native shell adds release overhead too early | Distraction from core reliability | Treat responsive web as primary; ship iOS only after the web journeys are stable. |

---

## 16. Open Product Decisions

The product owner must resolve these before general availability:

1. Which Clay businesses make up the first pilot cohort?
2. ~~What are the public plan names, prices, trial terms, setup fees, and transaction-fee policy?~~ **Resolved for Clay launch:**
   - **Business Showcase** — $20/mo or $200/yr (10×): business page, catalog/menu, appointments, mobile schedule, email notifications, analytics. No online ordering / SMS. Allowed storefront modes: `INFORMATION`, `APPOINTMENT`.
   - **Business Ordering** — $40/mo or $400/yr (recommended): everything in Business Showcase plus `online_ordering` and `sms_notifications`. Allowed modes include `ORDERING`.
   - **Trial:** 14 days on both public plans. **Setup fee:** $0. **Platform transaction fee:** 0% (Connect fees still apply to customer payments).
   - **Founding / complimentary:** first Clay pilot businesses may use `isBeta` / $0 plans, then convert to Business Showcase or Business Ordering.
   - **Not sold as SKUs at launch:** separate Mobile plan, paid Spotlight/featured placement, multi-location add-on.
3. Who is responsible for refunds, disputes, fulfillment failures, and customer support: TownHub, the business, or both?
4. What merchant verification is required before activation?
5. Which taxes are calculated by TownHub versus configured and remitted by each business?
6. What are the order, notification-log, device-token, and account-deletion retention policies?
7. What service-level expectation will TownHub communicate for order acknowledgement and support?
8. Will the beta run one API instance, or must shared live-event infrastructure ship first?
9. Is iOS TestFlight part of the town beta or a later retention experiment?
10. Which analytics provider and consent model will be used?

---

## 17. Feature Intake Standard

Every proposed feature must identify:

- the target persona and observed problem;
- evidence that the problem is material;
- the measurable outcome expected;
- acceptance criteria and failure states;
- authorization, privacy, payment, notification, and tenancy implications;
- the smallest end-to-end version that can validate the hypothesis;
- what will explicitly remain out of scope.

A feature is ready for implementation when it can be delivered as a coherent vertical slice across the necessary contract, data, API, UI, test, and documentation layers.

---

## 18. Related Product and Engineering References

- [Project overview](../README.md)
- [Release readiness](./RELEASE_READINESS.md)
- [Architecture](./ARCHITECTURE.md)
- [Security model](../SECURITY.md)
- [Production checklist](../PRODUCTION.md)
- [Notifications](./NOTIFICATIONS.md)
- [Stripe Connect setup](./STRIPE_SETUP.md)
- [Stripe Billing setup](./STRIPE_BILLING_SETUP.md)
- [Database backup and recovery](./DATABASE_BACKUP_AND_RECOVERY.md)
- [iOS application](./IOS_APP.md)
