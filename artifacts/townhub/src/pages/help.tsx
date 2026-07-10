import { Link } from "wouter";
import {
  HelpCircle,
  Search,
  ShoppingBag,
  Store,
  Sparkles,
  GraduationCap,
  MessageCircleQuestion,
  Mail,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { usePlatformBranding } from "@/components/theme-provider";
import { HelpVideoCard } from "@/components/help/help-video-card";
import { HelpTopicCard } from "@/components/help/help-topic-card";
import {
  featuredVideos,
  whatsNewItems,
  customerTopics,
  businessOwnerTopics,
  customerFaqs,
  businessOwnerFaqs,
  platformSupportContact,
  type HelpFaq,
} from "@/lib/help-content";

function FaqSection({ title, items }: { title: string; items: HelpFaq[] }) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircleQuestion className="h-5 w-5 text-primary" />
        <h2 className="font-serif text-2xl font-semibold">{title}</h2>
      </div>
      <Accordion type="single" collapsible className="w-full rounded-xl border bg-card px-4">
        {items.map((faq) => (
          <AccordionItem key={faq.id} value={faq.id}>
            <AccordionTrigger className="text-left font-medium hover:no-underline">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground leading-relaxed pb-4">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

export default function Help() {
  const { platformName } = usePlatformBranding();

  return (
    <div className="container mx-auto px-4 py-8 md:py-10 max-w-6xl">
      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 text-primary mb-3">
          <GraduationCap className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-wide">Learning Hub</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground flex items-center justify-center gap-2 flex-wrap">
          <HelpCircle className="h-8 w-8 text-primary hidden sm:block" />
          {platformName} Help Center
        </h1>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          Short videos, guided steps, and answers — whether you are shopping locally or running your business on the platform.
        </p>
      </div>

      {/* Search placeholder */}
      <div className="relative max-w-xl mx-auto mb-10">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          type="search"
          disabled
          placeholder="Search help articles — coming soon"
          className="pl-10 h-11 bg-muted/40"
          aria-label="Search help articles"
        />
      </div>

      {/* Featured videos */}
      <section className="mb-12">
        <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
          <div>
            <h2 className="font-serif text-2xl font-semibold">Featured training</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Start with a video overview, then dive into the guides below.
            </p>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {featuredVideos.map((video) => (
            <HelpVideoCard
              key={video.id}
              video={{
                ...video,
                title: video.id === "welcome" ? `Welcome to ${platformName}` : video.title,
              }}
            />
          ))}
        </div>
      </section>

      {/* What's New */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="font-serif text-2xl font-semibold">What&apos;s new</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
          {whatsNewItems.map((item) => (
            <Card
              key={item.id}
              className="min-w-[280px] max-w-sm shrink-0 snap-start border-primary/15 bg-gradient-to-br from-primary/5 to-transparent"
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-[10px]">
                    {item.dateLabel}
                  </Badge>
                  {item.tag && (
                    <Badge variant="outline" className="text-[10px]">
                      {item.tag}
                    </Badge>
                  )}
                </div>
                <h3 className="font-medium leading-snug">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.summary}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Audience tabs */}
      <Tabs defaultValue="customers" className="space-y-8">
        <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 h-11">
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
          <div className="rounded-2xl border bg-muted/20 p-5 md:p-6 text-center md:text-left">
            <p className="font-medium text-foreground">New here? Start with Customer Training above.</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              These guides walk you through browsing, ordering as a guest, and tracking purchases — no technical background needed.
            </p>
          </div>

          <section className="space-y-5">
            <h2 className="font-serif text-2xl font-semibold">Customer guides</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {customerTopics.map((topic) => (
                <HelpTopicCard key={topic.id} topic={topic} />
              ))}
            </div>
          </section>

          <FaqSection title="Customer FAQs" items={customerFaqs} />
        </TabsContent>

        <TabsContent value="owners" className="space-y-10 mt-0">
          <div className="rounded-2xl border bg-muted/20 p-5 md:p-6">
            <p className="font-medium text-foreground">Your guided journey</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Follow these steps from application through daily operations. Each card will become a full article over time.
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 snap-x">
              {businessOwnerTopics.map((topic) => (
                <a
                  key={topic.id}
                  href={`#help-${topic.id}`}
                  className="snap-start shrink-0 inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:bg-primary/5 transition-colors"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                    {topic.journeyStep}
                  </span>
                  <span className="whitespace-nowrap max-w-[140px] truncate">{topic.title}</span>
                </a>
              ))}
            </div>
          </div>

          <section className="space-y-5">
            <h2 className="font-serif text-2xl font-semibold">Business owner guides</h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {businessOwnerTopics.map((topic) => (
                <HelpTopicCard key={topic.id} topic={topic} showStep />
              ))}
            </div>
          </section>

          <FaqSection title="Business owner FAQs" items={businessOwnerFaqs} />
        </TabsContent>
      </Tabs>

      <section className="mt-14 rounded-2xl border bg-card p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2 text-left">
            <div className="inline-flex items-center gap-2 text-primary">
              <Mail className="h-5 w-5" />
              <h2 className="font-serif text-xl font-semibold text-foreground">Contact support</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
              Need help beyond these guides? Reach out to {platformSupportContact.providerName} for platform support.
            </p>
          </div>
          <a
            href={`mailto:${platformSupportContact.email}`}
            className="inline-flex items-center justify-center rounded-lg border bg-background px-4 py-2.5 text-sm font-medium hover:bg-muted/60 transition-colors shrink-0"
            data-testid="link-platform-support-email"
          >
            {platformSupportContact.email}
          </a>
        </div>
      </section>

      <div className="mt-8 rounded-2xl border border-dashed border-border bg-muted/30 p-6 md:p-8 text-center">
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
