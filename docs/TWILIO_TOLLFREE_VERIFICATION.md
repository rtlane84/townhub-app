# Twilio toll-free verification — LaneTech LLC / TownHaven

Guide for **+18447458087** (Request SID `HH93b064b8e71e4d74f966e2079f0de7bf`).

**Path:** Form **LaneTech LLC** → get **EIN** → resubmit Twilio as **Private Profit** with docs. File messaging as **owner SMS only** (Business Hub opt-in). Keep customer order texts in the product. No App Store update.

**Do not delete** the verification unless Twilio marks it non-editable. Prefer **Edit** → correct → Submit.

---

## A. Register the business first (before Twilio Submit)

1. File **LaneTech LLC** with your state ([WV SOS Business Organizations](https://sos.wv.gov/business/Pages/default.aspx) if WV).
2. Get an **EIN** from the IRS (online application; keep the confirmation letter / CP 575).
3. Save PDFs: Certificate of Organization (or Articles) + EIN letter.
4. Optional: file Trade Name (DBA) **TownHaven**. If you skip it, leave Twilio DBA blank.
5. Host PDFs as **public** links (Drive/Dropbox “anyone with the link”).
6. Deploy site so privacy/terms say **LaneTech LLC** operates TownHaven (`https://townhaven.io/privacy-policy`, `/terms-of-service`).
7. Then open Twilio and edit the rejected verification.

Also see [LEGAL_LAUNCH.md](./LEGAL_LAUNCH.md).

---

## B. Twilio Step 1 — Business and contact

| Field | Value |
|-------|--------|
| Legal entity name | `LaneTech LLC` (exact SOS spelling) |
| Website URL | `https://townhaven.io` |
| First name | `Ronald` |
| Last name | `Lane` |
| Email | `ronnie@lanetechwv.com` |
| Country / Phone | `+1` / `7174259111` |
| Business Type | **Private Profit** (not Public Profit, not Sole Proprietor) |
| Business DBA | `TownHaven` only if trade name is filed; otherwise **blank** |
| Business Registration Identifier | **EIN** |
| Business Registration Number | Your 9-digit EIN |
| Business Registration Issuing Country | **United States** |

### Additional Information (paste)

```text
TownHaven (https://townhaven.io) is operated by LaneTech LLC.
Certificate of Organization: <PUBLIC_URL_1>
EIN confirmation: <PUBLIC_URL_2>
Optional DBA filing: <PUBLIC_URL_3_IF_ANY>
Privacy: https://townhaven.io/privacy-policy
Terms: https://townhaven.io/terms-of-service
```

### Business location

Same street address as on SOS / EIN paperwork. City, state, ZIP, United States.

---

## C. Twilio Step 3 — Messaging (owner only)

| Field | Value |
|-------|--------|
| Estimated monthly volume | `1,000` |
| Opt-in type | **Web Form** |
| Use case categories | **Account Notifications** |
| Proof of consent | Direct image URL: Business Hub → Notifications, **Enable new order/appointment texts** **OFF** |
| E-mail for notifications | `ronnie@lanetechwv.com` |
| Privacy Policy URL | `https://townhaven.io/privacy-policy` |
| Terms & Conditions URL | `https://townhaven.io/terms-of-service` |
| Age gated content | Unchecked |
| Terms of Service checkbox | **Checked** |

### Use case description

```text
Transactional SMS to TownHaven business owners (LaneTech LLC). After an owner signs in, opens Business Hub → Notifications, enables "Enable new order/appointment texts" (default OFF), and saves a notification phone, TownHaven texts that phone when their storefront receives a new order or appointment request. Not marketing. Frequency varies with orders. Reply STOP to opt out; HELP for help.
```

### Sample message

```text
Clay Coffee: New Order #1042
Jane Doe · $24.50 · Paid
Subtotal: $22.00
Tax: $2.50
Total: $24.50
Pickup 5:00–5:15 PM
https://townhaven.io/dashboard/business/orders/1042
```

### Opt-In Confirmation Message (optional)

```text
TownHaven: SMS alerts enabled for this business. Reply STOP to opt out, HELP for help.
```

### Help Message Sample (optional)

```text
TownHaven owner alerts: Help at Ronnie@LaneTechWV.com or https://townhaven.io/help Reply STOP to opt out.
```

### Additional information (optional)

```text
LaneTech LLC operates TownHaven. Opt-in is Business Hub Notifications SMS Enable (default off).
```

---

## D. Opt-in screenshot

1. Sign in as a business owner on `https://townhaven.io`.
2. **Business Hub → Notifications**.
3. **Enable new order/appointment texts** unchecked.
4. Screenshot → host direct image URL → paste into Proof of consent.

---

## E. Submit checklist

1. [ ] LLC filed; Certificate saved
2. [ ] EIN issued; letter saved
3. [ ] Doc URLs public in Additional Information
4. [ ] Legal name `LaneTech LLC`
5. [ ] Type **Private Profit**
6. [ ] Website `https://townhaven.io`
7. [ ] EIN + United States
8. [ ] DBA blank unless TownHaven trade name filed
9. [ ] Address matches formation docs
10. [ ] Use case + sample pasted
11. [ ] Opt-in screenshot (Enable off)
12. [ ] Privacy + Terms URLs
13. [ ] Terms checkbox checked
14. [ ] **Send information for verification**
15. [ ] Wait for Approved (SMS stays restricted until then)

---

## Related

- [TWILIO_SETUP.md](./TWILIO_SETUP.md)
- [NOTIFICATIONS.md](./NOTIFICATIONS.md)
- [LEGAL_LAUNCH.md](./LEGAL_LAUNCH.md)
