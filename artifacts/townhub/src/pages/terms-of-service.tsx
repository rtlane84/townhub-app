import { Link } from "wouter";

const effectiveDate = "July 21, 2026";

export default function TermsOfService() {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <p className="text-sm text-muted-foreground">Effective {effectiveDate}</p>
      <h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">TownHub Terms of Service</h1>
      <div className="prose prose-slate mt-8 max-w-none dark:prose-invert">
        <p>
          These terms govern your use of TownHub, a local marketplace operated by LaneTech. By using
          TownHub, you agree to these terms and the <Link href="/privacy-policy">Privacy Policy</Link>.
          Business applicants and owners also agree to the <Link href="/business-seller-agreement">Business Seller Agreement</Link>.
        </p>

        <h2>The marketplace</h2>
        <p>
          TownHub helps customers find independent businesses, place orders, and request appointments.
          Each business is responsible for its listings, products, availability, fulfillment, customer
          service, taxes, refunds, and compliance with applicable law. Appointment submissions are requests
          until the business confirms them.
        </p>

        <h2>Accounts and acceptable use</h2>
        <p>
          Keep account credentials secure and provide accurate information. Do not misuse TownHub, probe
          or disrupt its systems, impersonate others, submit unlawful content, commit fraud, interfere
          with another user or business, scrape or automatically extract data, or use TownHub content or
          services for an unauthorized commercial purpose. We may restrict access when reasonably needed
          for safety, security, legal compliance, or violation of these terms.
        </p>

        <h2>TownHub intellectual property</h2>
        <p>
          TownHub and LaneTech retain all rights in TownHub&apos;s original software, user interfaces, text,
          graphics, logos, designs, databases, and other service content, except for content submitted by
          users or businesses. You may use TownHub only as made available for its intended purpose. Except
          where applicable law does not allow a restriction, you may not copy, modify, distribute, sell,
          sublicense, publicly reuse, create derivative works from, reverse engineer, decompile, attempt
          to extract source code from, or otherwise exploit TownHub or its content without LaneTech&apos;s prior
          written permission. Third-party and open-source components remain subject to their own licenses.
        </p>

        <h2>Orders, payments, and refunds</h2>
        <p>
          Prices, taxes, and fulfillment terms are shown before checkout. Card payments are processed by Stripe
          for the participating business; some businesses offer payment at pickup. The business is the seller
          responsible for fulfillment, customer service, and refunds, subject to applicable law and the payment method used.
        </p>

        <h2>Business services</h2>
        <p>
          Business applications require approval. Business owners are responsible for accurate listings,
          customer communications, lawful goods and services, account access, and fulfillment. Available
          tools depend on the assigned TownHub plan. Separate subscription terms presented during business
          onboarding or billing also apply.
        </p>

        <h2>Content and service availability</h2>
        <p>
          You retain ownership of content you submit and grant TownHub permission to host, display, resize,
          and distribute it as needed to operate and promote the marketplace. TownHub may change, suspend,
          or discontinue features and does not guarantee uninterrupted or error-free availability.
        </p>

        <h2>Disclaimers and liability</h2>
        <p>
          To the extent permitted by law, TownHub is provided as available without implied warranties.
          LaneTech is not responsible for a business&apos;s acts, products, services, or fulfillment. Liability
          is limited to the greatest extent permitted by applicable law; rights that cannot legally be
          waived remain unaffected.
        </p>

        <h2>Changes and contact</h2>
        <p>
          We may update these terms by posting a new effective date. Continued use after an update means
          you accept the revised terms. Questions can be sent to
          {" "}<a href="mailto:Ronnie@LaneTechWV.com">Ronnie@LaneTechWV.com</a>.
        </p>
      </div>
      <Link href="/" className="mt-8 inline-flex text-sm font-medium text-primary hover:underline">
        Return to TownHub
      </Link>
    </article>
  );
}
