import { Link } from "wouter";
import {
  HelpCircle,
  ShoppingBag,
  Store,
  ArrowRight,
  Users,
  Briefcase,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { usePlatformBranding } from "@/components/theme-provider";
import {
  businessOwnerFaqs,
  businessOwnerWorkflows,
  customerFaqs,
  customerWorkflows,
  type HelpWorkflow,
} from "@/lib/help-content";

function WorkflowCard({ workflow }: { workflow: HelpWorkflow }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg font-serif">{workflow.title}</CardTitle>
        <CardDescription>{workflow.summary}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
          {workflow.steps.map((step) => (
            <li key={step} className="leading-relaxed">
              {step}
            </li>
          ))}
        </ol>
        {workflow.link && (
          <Link href={workflow.link.href}>
            <Button variant="outline" size="sm" className="gap-1.5">
              {workflow.link.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function FaqAccordion({ items }: { items: typeof customerFaqs }) {
  return (
    <Accordion type="single" collapsible className="w-full">
      {items.map((faq) => (
        <AccordionItem key={faq.id} value={faq.id}>
          <AccordionTrigger className="text-left font-medium">
            {faq.question}
          </AccordionTrigger>
          <AccordionContent className="text-muted-foreground leading-relaxed">
            {faq.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export default function Help() {
  const { platformName } = usePlatformBranding();

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-2">
          <HelpCircle className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-serif font-bold text-foreground">Help Center</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl leading-relaxed">
          Learn how to use {platformName} — whether you are browsing local businesses,
          placing orders, or managing your own listing on the platform.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">For customers</p>
              <p className="text-sm text-muted-foreground mt-1">
                Browse businesses, order online, track purchases, and request appointments.
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-5 flex items-start gap-4">
            <div className="rounded-lg bg-primary/10 p-2.5 shrink-0">
              <Briefcase className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">For business owners</p>
              <p className="text-sm text-muted-foreground mt-1">
                Apply to list your business, manage your storefront, and run day-to-day operations.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="customers" className="space-y-8">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="customers" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            Customers
          </TabsTrigger>
          <TabsTrigger value="owners" className="gap-2">
            <Store className="h-4 w-4" />
            Business owners
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-10 mt-0">
          <section>
            <h2 className="font-serif text-2xl font-semibold mb-2">Getting started as a customer</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl">
              These are the main workflows for finding businesses and using the site with confidence.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {customerWorkflows.map((workflow) => (
                <WorkflowCard key={workflow.id} workflow={workflow} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold mb-4">Common questions</h2>
            <FaqAccordion items={customerFaqs} />
          </section>
        </TabsContent>

        <TabsContent value="owners" className="space-y-10 mt-0">
          <section>
            <h2 className="font-serif text-2xl font-semibold mb-2">Getting started as a business owner</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl">
              From your first application through daily order and appointment management in the Business Hub.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              {businessOwnerWorkflows.map((workflow) => (
                <WorkflowCard key={workflow.id} workflow={workflow} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-semibold mb-4">Common questions</h2>
            <FaqAccordion items={businessOwnerFaqs} />
          </section>
        </TabsContent>
      </Tabs>

      <div className="mt-12 rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Ready to explore?{" "}
          <Link href="/businesses" className="text-primary font-medium hover:underline">
            Browse all businesses
          </Link>
          {" "}or{" "}
          <Link href="/list-your-business" className="text-primary font-medium hover:underline">
            list your own
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
