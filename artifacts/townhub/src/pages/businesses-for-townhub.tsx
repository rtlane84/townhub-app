import { useEffect } from "react";
import { Link } from "wouter";
import {
  Bell,
  CalendarDays,
  Check,
  MapPinned,
  MapPin,
  MessageSquareText,
  Package,
  ShoppingBag,
  Store,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import storefrontImage from "@/assets/app-marketing/business-detail-order-local.png";
import businessHubImage from "@/assets/app-marketing/business-hub-overview.png";

const applicationHref = "/list-your-business";

const showcaseFeatures = [
  "Business page & catalog",
  "Appointment requests",
  "Mobile business schedule",
  "Email notifications",
  "Analytics",
] as const;

const orderingFeatures = [
  "Everything in Business Showcase",
  "Pickup and delivery ordering",
  "Order management dashboard",
  "SMS notifications",
] as const;

const benefitCards = [
  [Store, "A storefront that stays current", "Share your hours, photos, services, menu, and contact details."],
  [ShoppingBag, "Orders you manage", "Accept pickup and delivery orders when your business is ready, then run them from your dashboard."],
  [CalendarDays, "Requests you control", "Receive appointment requests and confirm them when they fit your schedule."],
  [MapPinned, "Made for mobile businesses", "Post daily and upcoming locations for trucks, pop-ups, and traveling businesses."],
  [Bell, "Stay in the loop", "Use email updates, with SMS alerts included in Business Ordering."],
] as const;

const faqs = [
  {
    question: "Is TownHub a replacement for my POS?",
    answer:
      "No. TownHub gives your business a simple local storefront and operations hub. You continue to run your business, fulfillment, and any existing systems the way you choose.",
  },
  {
    question: "Does TownHub deliver orders?",
    answer:
      "No. Business Ordering lets customers choose pickup or delivery when your business offers it. Your business controls delivery availability, area, fee, and fulfillment.",
  },
  {
    question: "Are appointments automatically booked?",
    answer:
      "No. Customers submit appointment requests, and you review and confirm, decline, or follow up on each request from your Business Hub.",
  },
  {
    question: "What happens after I apply?",
    answer:
      "We review your application, help you finish your storefront setup, and then you can publish when your information is ready. There is no setup fee and no platform transaction fee.",
  },
] as const;

function PlanCard({
  name,
  price,
  yearly,
  description,
  features,
  recommended = false,
}: {
  name: string;
  price: string;
  yearly: string;
  description: string;
  features: readonly string[];
  recommended?: boolean;
}) {
  return (
    <Card className={recommended ? "relative border-primary shadow-lg ring-1 ring-primary/20" : "relative"}>
      {recommended ? (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Recommended</Badge>
      ) : null}
      <CardHeader className="pb-3">
        <CardTitle className="font-serif text-2xl">{name}</CardTitle>
        <CardDescription className="min-h-20 leading-relaxed">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="font-serif text-4xl font-bold text-primary">{price}<span className="font-sans text-base font-medium text-muted-foreground">/mo</span></p>
          <p className="mt-1 text-sm text-muted-foreground">or {yearly}/yr. Includes a 14 day trial.</p>
        </div>
        <ul className="space-y-3 text-sm">
          {features.map((feature) => (
            <li key={feature} className="flex gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <Button asChild className="w-full" variant={recommended ? "default" : "outline"}>
          <Link href={applicationHref}>Start your 14 day trial</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function BusinessesForTownHub() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "TownHub for Clay businesses";
    return () => { document.title = previousTitle; };
  }, []);

  return (
    <main className="app-marketing overflow-hidden bg-background font-sans text-foreground">
      <section className="relative overflow-hidden bg-[#fafbfe] pb-16 pt-20 sm:pb-24 sm:pt-28">
        <div className="container mx-auto grid max-w-[1280px] gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:items-center">
          <div className="mx-auto max-w-2xl text-center lg:mx-0 lg:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
              <MapPin className="h-4 w-4 text-townhub-orange" aria-hidden />
              Launching first in Clay, West Virginia
            </div>
            <h1 className="font-serif text-5xl font-bold leading-[1.05] tracking-tight text-primary sm:text-6xl md:text-7xl lg:text-8xl">
              Put your business.
              <br />
              <span className="text-townhub-blue italic">Where Clay looks first.</span>
            </h1>
            <p className="mx-auto mt-7 max-w-xl text-xl leading-relaxed text-slate-600 md:text-2xl lg:mx-0">
              TownHub gives independent businesses a polished local storefront and a simple place to manage customer activity without building or maintaining your own app.
            </p>
            <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
              <a href={applicationHref} className="rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-white shadow-md transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                List your business
              </a>
              <a href="https://www.facebook.com/LaneTechLLC" target="_blank" rel="noopener noreferrer" className="rounded-full border border-gray-200 bg-white px-7 py-3.5 text-base font-semibold text-primary shadow-sm transition-all hover:border-primary/30 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                Message us on Facebook
              </a>
            </div>
            <p className="mt-5 text-sm text-slate-500">No setup fee. No TownHub platform transaction fee. Start with a 14 day trial.</p>
          </div>
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="absolute inset-6 -z-10 rounded-full bg-townhub-blue/5 blur-3xl" />
            <img src={storefrontImage} alt="A local business storefront on TownHub" className="mx-auto w-full max-w-md rounded-[2rem] border border-gray-100 bg-white shadow-2xl" />
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-6xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">One local home for your business</p>
          <h2 className="mt-2 font-serif text-3xl font-bold">More than a social post. Less work than another system.</h2>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {benefitCards.map(([Icon, title, description]) => {
            const FeatureIcon = Icon as typeof Store;
            return <Card key={title as string}><CardContent className="p-5"><FeatureIcon className="h-6 w-6 text-primary" aria-hidden /><h3 className="mt-4 font-semibold">{title as string}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description as string}</p></CardContent></Card>;
          })}
        </div>
      </section>

      <section id="plans" className="border-y bg-muted/35 py-16">
        <div className="container mx-auto max-w-6xl px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Simple pricing</p><h2 className="mt-2 font-serif text-3xl font-bold">Choose the tools that fit how you work.</h2><p className="mt-3 text-muted-foreground">Both plans include a 14 day trial. Upgrade to ordering whenever your business is ready.</p></div>
          <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2"><PlanCard name="Business Showcase" price="$20" yearly="$200" description="A public TownHub page for your hours, photos, products, menu, or services. Customers can browse, call, or request an appointment." features={showcaseFeatures} /><PlanCard name="Business Ordering" price="$40" yearly="$400" description="Everything in Business Showcase, plus pickup and delivery ordering that you manage from your dashboard." features={orderingFeatures} recommended /></div>
          <p className="mt-6 text-center text-sm text-muted-foreground">Customer card payments are processed through Stripe for eligible ordering businesses; standard Stripe processing fees still apply.</p>
        </div>
      </section>

      <section className="container mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
        <div className="order-2 lg:order-1"><img src={businessHubImage} alt="TownHub Business Hub showing daily business activity" className="w-full rounded-[2rem] border bg-card shadow-xl" /></div>
        <div className="order-1 lg:order-2"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">From application to live</p><h2 className="mt-2 font-serif text-3xl font-bold">A simple start, with you in control.</h2><ol className="mt-7 space-y-5">{[["1", "Apply", "Tell us your business name and category. Applying is free."], ["2", "Set up", "Add your logo, hours, menu or services, and the options that fit your business."], ["3", "Go live", "Publish your local storefront and manage activity in your Business Hub."]].map(([number, title, description]) => <li key={number} className="flex gap-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{number}</span><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p></div></li>)}</ol></div>
      </section>

      <section className="border-t bg-muted/25 py-16"><div className="container mx-auto max-w-3xl px-5 sm:px-6"><div className="text-center"><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Questions answered</p><h2 className="mt-2 font-serif text-3xl font-bold">Built around your business.</h2></div><Accordion type="single" collapsible className="mt-8 rounded-2xl border bg-card px-5">{faqs.map((faq) => <AccordionItem value={faq.question} key={faq.question}><AccordionTrigger className="text-left hover:no-underline">{faq.question}</AccordionTrigger><AccordionContent className="leading-relaxed text-muted-foreground">{faq.answer}</AccordionContent></AccordionItem>)}</Accordion></div></section>

      <section className="bg-[#fafbfe] py-24">
        <div className="container mx-auto max-w-[1280px] px-5 sm:px-8">
          <div className="rounded-[3rem] border border-gray-100 bg-white px-6 py-14 text-center shadow-xl sm:px-12">
            <Package className="mx-auto h-8 w-8 text-primary" aria-hidden />
            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.16em] text-primary">Start your local presence</p>
            <h2 className="mt-2 font-serif text-4xl font-bold tracking-tight text-primary sm:text-5xl">Ready to bring your business onto TownHub?</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-slate-600">Start your application today. We will help you get your business information ready to share with Clay.</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a href={applicationHref} className="rounded-full bg-primary px-7 py-3.5 text-base font-semibold text-white shadow-md transition-all hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">List your business</a>
              <a href="https://www.facebook.com/LaneTechLLC" target="_blank" rel="noopener noreferrer" className="rounded-full border border-gray-200 bg-white px-7 py-3.5 text-base font-semibold text-primary shadow-sm transition-all hover:border-primary/30 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">Message us on Facebook</a>
            </div>
            <p className="mt-6 text-sm text-slate-500"><MessageSquareText className="mr-1 inline h-4 w-4" /> Prefer email? <a className="font-medium text-primary underline underline-offset-4" href="mailto:Ronnie@LaneTechWV.com">Ronnie@LaneTechWV.com</a></p>
          </div>
        </div>
      </section>
    </main>
  );
}
