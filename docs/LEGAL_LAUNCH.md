# Legal launch controls — Clay, West Virginia

This is TownHub's operational launch checklist, not legal or tax advice. The platform cannot accept live orders until the owner records the approvals and evidence below.

## Required external approvals

- [ ] West Virginia entity formation, EIN, banking, bookkeeping, insurance, State Tax Department Business Registration Certificate, and any Clay municipal license are complete and retained outside this repository.
- [ ] A West Virginia business/technology lawyer has approved the public [Terms of Service](../artifacts/townhub/src/pages/terms-of-service.tsx), [Privacy Policy](../artifacts/townhub/src/pages/privacy-policy.tsx), and [Business Seller Agreement](../artifacts/townhub/src/pages/business-seller-agreement.tsx), including effective dates and contact details.
- [ ] After that written approval, set `BUSINESS_SELLER_AGREEMENT_APPROVED_VERSION=2026-07-21` in the production secret manager. The API rejects business listing applications in production until this matches the published agreement version.
- [ ] A West Virginia sales-tax CPA has issued a written determination covering TownHub's marketplace-facilitator/merchant-of-record treatment, taxable transactions, destination sourcing, registrations, returns, and monthly Stripe-to-ledger reconciliation.
- [ ] A trademark lawyer has completed clearance for the word mark and logo before filing, domain purchase, signage, or paid marketing. Record search date, jurisdictions, results, filing serial number, and owner entity outside the repository.

## Product and operating checks

- [ ] Each applicant accepts the versioned Business Seller Agreement in the application flow. The database records the version and timestamp; an application cannot be submitted without acceptance.
- [ ] Before approving a business, an administrator verifies identity, public contact details, business authority, applicable permits, Stripe Connect status for card ordering, fulfillment/refund policy, and any restricted goods/services decision.
- [ ] Every customer receipt/confirmation clearly identifies the business, order reference, items, tax, delivery fee, total, payment status, and support path. The business handles fulfillment and product/service disputes; TownHub handles platform, sign-in, and payment-status issues.
- [ ] Subscription billing is the only TownHub revenue model for the Clay pilot. Do not activate a customer-order platform fee or change tax/payment language until counsel and the CPA approve the updated model.
- [ ] Production backups, restore drill, account-deletion runbook, access review, and incident-response rehearsal are complete.

## Evidence and re-review

Keep legal approvals, permits, insurance, tax filings, reconciliation reports, vendor agreements, security-review records, and signed IP assignments in the restricted company records system—not in git.

Re-review terms, privacy disclosures, tax treatment, Stripe configuration, and insurance before expanding beyond Clay, adding delivery operations, charging transaction fees, selling regulated goods, using advertising tracking, or launching in another state.

## Intellectual property

Register original source code and design assets for copyright when counsel recommends it. Use written invention records for a concrete technical invention, keep it confidential before public disclosure, and obtain patent counsel's eligibility/prior-art opinion before filing a provisional. A local-commerce marketplace concept alone is not a patent strategy.
