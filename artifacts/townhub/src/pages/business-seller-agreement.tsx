import { Link } from "wouter";

const effectiveDate = "July 21, 2026";

/**
 * Public agreement accepted when an owner submits a listing application.
 * Counsel must approve changes before the version/date is published in production.
 */
export default function BusinessSellerAgreement() {
  return (
    <article className="container mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <p className="text-sm text-muted-foreground">Effective {effectiveDate}</p>
      <h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">TownHub Business Seller Agreement</h1>
      <div className="prose prose-slate mt-8 max-w-none dark:prose-invert">
        <p>
          This agreement applies to a business or authorized representative that applies to list, sell, or
          accept requests through TownHub. It supplements the <Link href="/terms-of-service">TownHub Terms of Service</Link>.
        </p>

        <h2>Your business and listings</h2>
        <p>
          You confirm that you are authorized to act for the business and will provide complete, accurate,
          and current business identity, contact, hours, availability, pricing, tax, fulfillment, and product or
          service information. You are responsible for the goods and services you offer, required licenses and
          permits, and compliance with laws that apply to your business.
        </p>

        <h2>Orders, payments, taxes, and customer care</h2>
        <p>
          Your business is responsible for accepting and fulfilling its orders, communicating material changes,
          resolving customer questions, and issuing refunds or cancellations required by law or your stated policy.
          Online card payments are processed through your Stripe-connected account. TownHub subscription fees are
          separate from customer order payments. Tax collection, reporting, and remittance responsibilities remain
          subject to the final written direction of TownHub&apos;s tax adviser and applicable law.
        </p>

        <h2>Prohibited activity</h2>
        <p>
          Do not list unlawful, unsafe, counterfeit, infringing, recalled, age-restricted without required controls,
          or otherwise prohibited goods or services; misrepresent your business; misuse customer data; or use the
          service to defraud customers or payment providers. TownHub may remove content, pause ordering, or suspend
          access when reasonably necessary for safety, security, legal compliance, or an agreement violation.
        </p>

        <h2>Your content and data</h2>
        <p>
          You keep ownership of content you provide, and grant TownHub a non-exclusive right to host, reproduce,
          resize, display, and distribute it as needed to operate and promote your listing and the marketplace. Use
          customer information only to fulfill the relevant transaction, provide customer support, comply with law,
          or as otherwise permitted by the customer and TownHub&apos;s privacy practices.
        </p>

        <h2>Subscription, suspension, and ending service</h2>
        <p>
          Available tools and pricing are shown with your plan. Billing, cancellation, and invoice handling are
          managed through Stripe where applicable. TownHub may suspend or end access for nonpayment, an inactive or
          unsafe business, legal requirements, or a material violation. Before ending service, export or request any
          records you need, subject to lawful retention, privacy, payment, and dispute obligations.
        </p>

        <h2>Claims and contact</h2>
        <p>
          To the extent permitted by law, you will defend and indemnify TownHub and LaneTech from third-party claims
          caused by your business, listings, goods or services, fulfillment, or breach of this agreement. Questions
          about this agreement, complaints, or a required update can be sent to{" "}
          <a href="mailto:Ronnie@LaneTechWV.com">Ronnie@LaneTechWV.com</a>.
        </p>

        <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          This document is a launch draft and must receive written West Virginia counsel approval before production
          use. Do not change its effective date or acceptance version without recording the approved revision.
        </p>
      </div>
      <Link href="/list-your-business" className="mt-8 inline-flex text-sm font-medium text-primary hover:underline">
        Apply to list your business
      </Link>
    </article>
  );
}
