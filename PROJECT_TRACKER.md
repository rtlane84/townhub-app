# **LocalOrderHub Project Tracker**

*Last updated: 2026-06-25*

## **1. Project Summary**

**LocalOrderHub** is a local town/county online hub for small businesses and community activity.

The goal is to give local businesses a simple digital presence without requiring them to build large custom systems. Customers should be able to find businesses, view business pages, order food/products, request appointments, see food truck locations, follow local events, and stay connected with what is happening around town.

Long-term branding examples:

- Clay LocalOrderHub
- Calhoun LocalOrderHub
- LocalOrderHub for other towns/counties

---

## **2. Product Vision**

LocalOrderHub should support more than just online ordering.

It should work for:

- restaurants and diners
- food trucks
- flower shops
- greenhouses / small markets
- retail stores
- hardware / lumber stores
- service businesses
- salons
- funeral homes
- businesses that only want an information page
- businesses that want appointment requests but not product sales

Not every business should be forced to sell products. The platform should support multiple storefront modes:

- product ordering
- food ordering
- appointment request
- information-only listing
- food truck schedule/location page
- service/contact page
- event/announcement-focused page

---

## **3. Current Stack**

### **Frontend**

- React 18
- Vite
- Tailwind CSS
- shadcn/ui
- wouter
- TanStack Query
- Clerk auth

### **Backend**

- Express 5
- TypeScript
- PostgreSQL
- Drizzle ORM
- OpenAPI + generated client/Zod schemas
- Clerk auth middleware
- Stripe foundation
- notification logging foundation

---

## **4. Completed / Mostly Completed**

### **Core marketplace**

- Public homepage
- Business directory
- Business storefront pages
- Cart flow
- Checkout foundation
- Order confirmation page
- Business application flow
- Business owner dashboard
- Admin dashboard
- Community events
- Highlights
- Food truck locations
- Subscription plan foundations

### **Auth / roles / security**

- Clerk auth integrated
- Admin bootstrap flow
- Customer / Business Owner / Admin roles
- Admin route guard/security hardening pass
- Business route auth tightened
- Highlight/admin access tightened
- Subscription ownership checks improved
- Production/security docs created

### **Events**

- Events link added to public nav
- Events page added
- Featured Events section
- Upcoming Events section
- Featured event logic working
- Event date range support added
- Event cards/date formatting utilities added

### **Branding / platform settings**

- Platform branding setting added
- Admin can move toward town names like Clay LocalOrderHub
- Header/footer/homepage branding support started

### **Business setup**

- Structured business hours added
- Payment modes added:
  - online only
  - pay at pickup only
  - both
- Subscription plan behavior improved
- Profile dropdown visibility improved

### **Salon groundwork**

- SALON business type added
- Salon category/business type groundwork added
- Salon appointment direction chosen: request-based, not instant booking

---

## **5. In Progress**

### **Owner Notifications**

**Branch:** `cursor/owner-notifications`

Goal:

Business owners should get fast alerts for:

- new orders
- new salon appointment requests

Chosen MVP notification model:

- email = backup/record
- SMS = urgent owner alert
- platform owns Resend/Twilio setup
- businesses do not create their own Resend/Twilio accounts

Planned business settings:

- notificationEmail
- notificationPhone
- notifyNewOrdersByEmail
- notifyNewOrdersBySms
- notifyAppointmentRequestsByEmail
- notifyAppointmentRequestsBySms

Important:

- Customer SMS is not MVP priority.
- Owner SMS is important because email may not be seen fast enough.

### Owner Notifications implementation notes

- Platform-level email/SMS implemented with Resend/SMTP and Twilio.

- Businesses configure notification email/phone and alert toggles.

- New order alerts support email/SMS to owner.

- Salon appointment request alerts support email/SMS to owner.

- Customer SMS intentionally excluded from MVP.

- Missing providers log clearly and do not crash.

- DB push currently needs safe fix for notification_logs.event_type default/nullability.

---

## **6. Immediate Next Priorities**

1. Finish owner notifications.
2. Build salon appointment request MVP.
3. Clean up customer email notifications.
4. Improve image upload/media handling.
5. Fix business/storefront color customization.
6. UI refresh / polish pass.
7. Stripe production setup/hardening before real money.
8. Consider admin-managed weather/gas/local info widgets.

---

## **7. Planned Features**

### **Salon Appointment Request MVP**

**Planned branch:** `cursor/salon-appointment-requests`

MVP decision:

Do not do instant automatic booking first.

Use request-based booking:

1. Customer requests appointment.
2. Salon owner gets email/SMS.
3. Owner reviews their paper/phone schedule.
4. Owner confirms or declines.
5. Owner can manually enter appointments that came by phone/walk-in.

Needed:

- salon services
- appointment request form
- owner appointment dashboard
- confirm / decline / cancel / complete statuses
- manual appointment entry
- clear customer wording: “request submitted, not confirmed yet”

---

### **Email / SMS Notifications**

Needed:

- real Resend email sending
- Twilio SMS sending
- notification logs with SENT / FAILED / LOGGED
- owner email/SMS for new orders
- owner email/SMS for appointment requests
- customer email for order/appointment confirmations
- approval/rejection application emails

Later:

- optional customer SMS
- appointment reminders
- order ready texts
- SMS limits by plan

---

### **Stripe / Payments**

Needed before real payments:

- finish Stripe setup
- Stripe webhook signature verification
- production-safe payment status updates
- real recurring subscriptions later
- Stripe customer portal later
- make sure payment modes are enforced server-side

Current payment modes:

- online only
- pay at pickup only
- both

---

### **Images / Media**

Implemented (TOW-43):

- Supabase Storage backend (default) with server-side upload via `/api/media/upload`
- `media_assets` metadata table (storage path + public URL)
- Reusable `ImageField` UI: upload, library picker, preview, replace, remove, URL fallback
- Surfaces: product, business logo/hero, events, highlights, platform logo

Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`

Optional dev fallback: `MEDIA_STORAGE=local` writes to `./uploads` (not for production).

Possible future storage:

- CDN in front of Supabase public bucket
- Image transforms / resizing

---

### **Weather / Local Info**

Ideas:

- today’s weather
- 7-day forecast
- homepage local info section

Need to decide:

- whether weather belongs in MVP
- whether to use a weather API
- whether it makes homepage too cluttered

---

### **Gas Prices**

Idea:

Show local gas prices on homepage.

Current recommendation:

Use admin-managed gas prices first, not automation.

Reason:

Only a few local gas stations and some are mom-and-pop. Automated gas price APIs may be unreliable or unavailable.

Possible MVP:

- station name
- regular price
- diesel price optional
- last updated time
- admin edit screen

---

### **Business Color / Theme Customization**

Current issue:

- business page color selection may not exist or may not carry over correctly
- admin-set business colors may not apply to public storefront
- business cards may have faint/odd category styling such as food vendor tint

Needed:

- business accent color
- business button color
- optional storefront banner color
- admin can set/edit business colors
- business owner can set/edit business colors if allowed
- public storefront uses the saved colors
- business cards use consistent readable styling
- category badges should be clear but not washed out/faint

---

### **Storefront Flexibility / Non-Commerce Mode**

Needed:

Some businesses should not have to sell anything.

Support storefront modes:

- ordering
- appointment request
- information only
- food truck/location updates only
- service/contact page
- events/announcements page

Examples:

- funeral home may want info/contact only
- food truck may mostly need current location/schedule
- salon may need appointment requests
- hardware/lumber may want quote/contact flow
- some local businesses may just want a clean page and phone number

---

### **UI Refresh**

Current feeling:

The UI works, but the overall style may need improvement.

Needed:

- review homepage layout
- review storefront layout
- review business cards
- review category badges
- improve visual hierarchy
- make it feel less generic
- keep rural/local tone without being cheesy
- improve public-facing polish before pitching businesses

Do this incrementally, not as one giant rewrite.

---

## **8. Feature Backlog**

### **Public Site / Homepage**

- Events page
- Featured events
- Upcoming events
- Platform/town branding
- Weather today + 7-day forecast
- Gas prices widget
- Better local/community hub widgets
- UI refresh
- Stronger town/county identity

### **Businesses / Storefronts**

- Business pages
- Structured hours
- Payment modes
- Salon type groundwork
- Business color customization
- Admin business colors carrying to storefront
- Image upload workflow
- Recommended image sizes
- Non-commerce storefront mode
- Appointment request mode
- Food truck-only mode
- Service/contact-only mode
- Better business card category styling

### **Business Dashboard**

- Hours management
- Payment mode settings
- Owner notification settings
- Salon services management
- Appointment request management
- Manual appointment entry
- Business image upload/selection
- Storefront color settings

### **Admin Dashboard**

- Plan management
- Branding settings
- Event management
- Highlights
- Gas price admin widget
- Weather/local info settings if needed
- Admin image management/uploads
- Better business color/theme controls
- More dashboard polish

### **Payments / Notifications**

- Payment mode support
- Owner email alerts
- Owner SMS alerts
- Customer email cleanup
- Stripe webhook hardening
- Finish Stripe setup
- Recurring subscriptions later
- Customer SMS later

### **Salon / Appointments**

- SALON business type
- Appointment request MVP
- Services list
- Owner confirm/decline
- Manual appointments
- Customer confirmation emails
- Owner SMS/email alerts
- Calendar sync later
- Deposits later

---

## **9. Branch History**

### **Completed / merged**

- `cursor/featured-events`
- `cursor/platform-branding`
- `cursor/subscription-plan-fixes`
- `cursor/structured-business-hours`
- `cursor/business-payment-modes`
- `cursor/salon-business-type`

### **In progress**

- `cursor/owner-notifications`

### **Planned**

- `cursor/salon-appointment-requests`
- `cursor/customer-email-cleanup`
- `cursor/image-upload-media`
- `cursor/business-theme-colors`
- `cursor/stripe-webhook-hardening`
- `cursor/ui-refresh`
- `cursor/homepage-weather`
- `cursor/homepage-fuel-prices`

---

## **10. Testing Checklist**

### **Core public flow**

- homepage loads
- businesses page loads
- business storefront loads
- events page loads
- featured events show correctly
- upcoming events show correctly

### **Business onboarding**

- customer can submit business application
- admin can approve application
- business owner gets dashboard access
- selected/default plan attaches correctly

### **Business setup**

- business owner can update hours
- business owner can update payment mode
- business owner can update notifications
- business owner can update images/colors when implemented

### **Orders**

- online-only checkout works
- pay-at-pickup-only checkout works
- both payment options work
- invalid payment method is blocked
- new order appears in dashboard
- owner notification sends/logs

### **Salon**

- salon business type appears in filters/forms
- salon storefront shows appointment-focused language
- appointment request can be submitted
- owner receives notification
- owner can confirm/decline request
- customer receives confirmation/decline email

### **Notifications**

- email provider missing does not crash
- SMS provider missing does not crash
- notification logs show status
- owner email works
- owner SMS works

### **Media**

- image upload works when implemented
- previews display correctly
- recommended image sizes shown in forms

---

## **11. Product Decisions Log**

### **2026-06-25**

- LocalOrderHub should be a local hub, not just an ordering app.
- Events and food truck locations are important local features.
- Salon scheduling should be request-based first.
- Owner notifications need SMS because email may not be fast enough.
- Businesses should not set up their own Resend/Twilio.
- Platform owner controls sending providers.
- Not every business should have to sell products.
- Gas prices are optional and probably admin-managed first.
- UI needs a future polish pass.
- Image upload/local media support is needed because URL-only images are not user friendly.

