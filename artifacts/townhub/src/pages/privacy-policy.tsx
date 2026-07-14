import { Link } from "wouter";

const effectiveDate = "July 14, 2026";

export default function PrivacyPolicy() {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <p className="text-sm text-muted-foreground">Effective {effectiveDate}</p>
      <h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">TownHub Privacy Policy</h1>
      <div className="prose prose-slate mt-8 max-w-none dark:prose-invert">
        <p>
          TownHub, operated by LaneTech, helps residents discover and transact with local
          businesses. This policy explains the information TownHub handles and the choices
          available to you.
        </p>

        <h2>Information we collect</h2>
        <ul>
          <li>Account details, such as your name, email address, account identifier, and role.</li>
          <li>Order and appointment details, including contact information, items, fulfillment choices, and status.</li>
          <li>Business listing and owner-provided content, including business contact details, photos, products, hours, and locations.</li>
          <li>Payment status and provider identifiers. TownHub does not store complete card numbers.</li>
          <li>Device tokens, notification preferences, diagnostics, security events, and usage information needed to operate and improve the service.</li>
        </ul>

        <h2>How we use information</h2>
        <p>
          We use information to provide accounts, storefronts, orders, appointments, notifications,
          customer support, fraud prevention, security, service diagnostics, and legally required records.
          We do not sell personal information or use it for third-party behavioral advertising.
        </p>

        <h2>When information is shared</h2>
        <p>
          Information is shared only as needed with the business involved in your transaction and
          service providers that support identity, hosting, database operations, payments, email,
          text messaging, push notifications, maps, and error monitoring. Payment providers process
          payment details under their own privacy terms.
        </p>

        <h2>Retention and deletion</h2>
        <p>
          We retain information while your account is active and as needed to operate TownHub, resolve
          disputes, prevent fraud, and meet tax, accounting, payment, and other legal obligations.
          You can initiate account deletion from Account settings while signed in. We may preserve
          transaction or business records when legally required and will explain any applicable retention.
        </p>

        <h2>Your choices</h2>
        <p>
          You can update account details through the account profile, control available notification
          preferences, use guest checkout where offered, and request account deletion. Apple users may
          choose Hide My Email when using Sign in with Apple.
        </p>

        <h2>Security and children</h2>
        <p>
          We use access controls, encryption in transit, provider security controls, and monitoring to
          protect information. No system is completely secure. TownHub is not directed to children under 13.
        </p>

        <h2>Changes and contact</h2>
        <p>
          We may update this policy and will post a new effective date. Questions or privacy requests can
          be sent to <a href="mailto:Ronnie@LaneTechWV.com">Ronnie@LaneTechWV.com</a>.
        </p>
      </div>
      <Link href="/" className="mt-8 inline-flex text-sm font-medium text-primary hover:underline">
        Return to TownHub
      </Link>
    </article>
  );
}
