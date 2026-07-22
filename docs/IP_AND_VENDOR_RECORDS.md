# IP, vendor, and data-governance records

> Operational record. Keep this current as vendors, licenses, ownership, or data handling changes.

Keep the following records in a restricted company folder with role-limited access. Do not commit agreements, identities, tax IDs, signature pages, or credentials to this repository.

## IP register

For each employee, contractor, designer, photographer, and agency, record: legal name; signed confidentiality/IP assignment location; effective date; work description; repository/design access; and confirmation that third-party material has an appropriate license. Maintain an inventory of logos, photos, fonts, UI assets, and open-source notices.

Before granting production access, verify all of the following:

- [ ] The contributor agreement assigns work product to LaneTech and includes confidentiality obligations.
- [ ] Repository, design, hosting, and provider access is limited to the contributor&apos;s role and has a named offboarding owner.
- [ ] External code, media, fonts, icons, and templates have a recorded source and license compatible with proprietary use.
- [ ] No contributor uses personal accounts, unapproved assets, or copied competitor material in TownHub work.

On offboarding, revoke access, retrieve company materials, and confirm the assignment record is complete.

## Code and asset provenance

For each release, record the release commit, primary contributors, material third-party packages/assets added, their licenses, and whether a proprietary-notice review passed. The root `LICENSE` governs LaneTech&apos;s original repository materials; it does not replace third-party notices.

## Vendor register

For each provider: purpose, data categories, account owner, data location, DPA/security terms URL, retention/deletion process, subprocessors, breach contact, and offboarding/export procedure. Current expected categories include identity, payments, hosting, database, media storage, email, SMS, push, analytics, and error monitoring.

## Data inventory and retention decisions

Map each data category to its purpose, access roles, system of record, sharing recipients, deletion workflow, and approved retention period. Orders, refunds, tax/accounting, fraud-prevention, payment, and security evidence may have different lawful retention requirements; counsel/CPA must set the durations before live operations.

## Invention record

For a potential technical invention, record problem, technical mechanism, diagrams, inventors, test evidence, dates, prior-art search, public disclosures, and counsel's decision. Do not label a feature patent-pending or file a provisional without patent counsel.

## Confidential material

Store credentials, customer lists, pricing strategy, nonpublic product plans, signed agreements, tax records, and invention records only in approved restricted systems. Do not place them in git, public issue trackers, screenshots, analytics, error reporting, or chat.
