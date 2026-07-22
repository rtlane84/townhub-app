import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  BookOpen,
  Flag,
  GraduationCap,
  HelpCircle,
  Mail,
  RotateCcw,
  Search,
  ShoppingBag,
  Store,
} from "lucide-react";
import { HelpGuideAccordion } from "@/components/help/help-guide-accordion";
import { HelpVideoCard } from "@/components/help/help-video-card";
import { ReportProblemSheet } from "@/components/report-problem-sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePlatformBranding } from "@/components/theme-provider";
import {
  customerHelp,
  featuredVideos,
  filterHelpDirectory,
  platformSupportContact,
  resolveBusinessOwnerHelpForDistribution,
  type HelpAudience,
  type HelpFaq,
} from "@/lib/help-content";
import { isStoreDistribution } from "@/lib/distribution-channel";
import {
  isReportFabDismissed,
  REPORT_FAB_VISIBILITY_EVENT,
  setReportFabDismissed,
} from "@/lib/report-problem-fab-dismiss";
import { cn } from "@/lib/utils";

const audienceCopy: Record<HelpAudience, { title: string; description: string }> = {
  customer: {
    title: "Customer help",
    description: "Learn how to discover local businesses, order, track purchases, and request appointments.",
  },
  owner: {
    title: "Business owner help",
    description: "Follow setup in order, then use the operations guides whenever your team needs them.",
  },
};

function FaqSection({ items }: { items: HelpFaq[] }) {
  if (!items.length) return null;

  return (
    <section id="help-faqs" className="scroll-mt-28 space-y-4" aria-labelledby="help-faq-heading">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Quick answers</p>
        <h2 id="help-faq-heading" className="mt-1 font-serif text-2xl font-semibold">
          Frequently asked questions
        </h2>
      </div>
      <Accordion type="single" collapsible className="rounded-2xl border bg-card px-4 sm:px-5">
        {items.map((faq) => (
          <AccordionItem key={faq.id} value={faq.id}>
            <AccordionTrigger className="text-left font-medium hover:no-underline">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="pb-4 leading-relaxed text-muted-foreground">
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
  const [audience, setAudience] = useState<HelpAudience>("customer");
  const [query, setQuery] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [fabDismissed, setFabDismissed] = useState(() => isReportFabDismissed());
  const ownerHelp = useMemo(
    () => resolveBusinessOwnerHelpForDistribution(isStoreDistribution()),
    [],
  );
  const directory = audience === "customer" ? customerHelp : ownerHelp;
  const results = useMemo(() => filterHelpDirectory(directory, query), [directory, query]);
  const activeVideos = useMemo(
    () => featuredVideos.filter(
      (video) => video.video && (video.audience === "all" || video.audience === audience),
    ),
    [audience],
  );
  const resultTotal = results.guideCount + results.faqCount;
  const searchActive = query.trim().length > 0;

  useEffect(() => {
    const sync = () => setFabDismissed(isReportFabDismissed());
    window.addEventListener(REPORT_FAB_VISIBILITY_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(REPORT_FAB_VISIBILITY_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 pb-[calc(2rem+var(--native-bottom-tab-height,0px))] md:py-12">
      <header className="mx-auto max-w-3xl text-center">
        <div className="mb-3 inline-flex items-center gap-2 text-primary">
          <GraduationCap className="h-5 w-5" aria-hidden />
          <span className="text-sm font-semibold uppercase tracking-[0.16em]">Help Center</span>
        </div>
        <h1 className="flex flex-wrap items-center justify-center gap-2 font-serif text-3xl font-bold text-foreground md:text-5xl">
          <HelpCircle className="hidden h-9 w-9 text-primary sm:block" aria-hidden />
          Learn how {platformName} works
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg">
          Clear instructions for shopping locally and setting up or running a business.
        </p>
      </header>

      <div
        className="mx-auto mt-8 grid h-12 w-full max-w-md grid-cols-2 rounded-xl bg-muted p-1"
        role="group"
        aria-label="Choose help audience"
      >
        {(
          [
            { value: "customer" as const, label: "Customers", icon: ShoppingBag },
            { value: "owner" as const, label: "Business owners", icon: Store },
          ] as const
        ).map(({ value, label, icon: Icon }) => {
          const selected = audience === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={selected}
              onClick={() => setAudience(value)}
              className={cn(
                "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors",
                selected
                  ? "bg-background text-foreground shadow-sm"
                  : "text-foreground/80 hover:text-foreground",
              )}
              data-testid={`help-tab-${value}`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          );
        })}
      </div>

      <section className="mx-auto mt-6 max-w-3xl rounded-2xl border bg-card p-4 shadow-sm sm:p-5" aria-label="Search help">
        <div className="flex items-start gap-3">
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex">
            <BookOpen className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-serif text-lg font-semibold">{audienceCopy[audience].title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {audienceCopy[audience].description}
            </p>
          </div>
        </div>
        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${audience === "customer" ? "customer" : "business owner"} help`}
            className="h-11 bg-background pl-10 pr-24"
            aria-label={`Search ${audience === "customer" ? "customer" : "business owner"} help`}
            data-testid="input-help-search"
          />
          {searchActive ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setQuery("")}
              className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 gap-1 px-2.5 text-xs"
              data-testid="button-clear-help-search"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Clear
            </Button>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-muted-foreground" role="status" aria-live="polite">
          {searchActive
            ? `${resultTotal} ${resultTotal === 1 ? "result" : "results"} for “${query.trim()}”`
            : `${results.guideCount} guides and ${results.faqCount} quick answers`}
        </p>
      </section>

      {activeVideos.length > 0 ? (
        <section className="mt-10" aria-labelledby="help-training-heading">
          <h2 id="help-training-heading" className="font-serif text-2xl font-semibold">Video training</h2>
          <div className="mt-4 grid gap-5 md:grid-cols-3">
            {activeVideos.map((video) => (
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
      ) : null}

      {resultTotal === 0 ? (
        <Card className="mx-auto mt-10 max-w-2xl border-dashed">
          <CardContent className="flex flex-col items-center p-8 text-center sm:p-10">
            <Search className="h-9 w-9 text-muted-foreground/50" aria-hidden />
            <h2 className="mt-4 font-serif text-xl font-semibold">No matching help found</h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
              Try a shorter phrase, switch audiences, or contact TownHub support for a platform question.
            </p>
            <Button variant="outline" className="mt-5" onClick={() => setQuery("")}>Show all guides</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {!searchActive ? (
            <nav className="mt-8 flex gap-2 overflow-x-auto pb-2 lg:hidden" aria-label="Help sections">
              {results.categories.map((category) => (
                <a
                  key={category.id}
                  href={`#help-category-${category.id}`}
                  className="shrink-0 rounded-full border bg-card px-3 py-2 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  {category.title}
                </a>
              ))}
              <a href="#help-faqs" className="shrink-0 rounded-full border bg-card px-3 py-2 text-xs font-medium">
                FAQs
              </a>
            </nav>
          ) : null}

          <div className="mt-10 grid items-start gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
            <aside className="sticky top-24 hidden rounded-2xl border bg-card p-4 lg:block">
              <p className="px-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                In this guide
              </p>
              <nav className="mt-3 space-y-1" aria-label="Help sections">
                {results.categories.map((category) => (
                  <a
                    key={category.id}
                    href={`#help-category-${category.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-primary/5 hover:text-foreground"
                  >
                    <span>{category.title}</span>
                    <Badge variant="secondary" className="min-w-6 justify-center px-1.5 text-[10px]">
                      {category.guides.length}
                    </Badge>
                  </a>
                ))}
                {results.faqs.length > 0 ? (
                  <a href="#help-faqs" className="block rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-primary/5 hover:text-foreground">
                    FAQs
                  </a>
                ) : null}
              </nav>
            </aside>

            <main className="min-w-0 space-y-12">
              {results.categories.map((category) => (
                <section
                  key={category.id}
                  id={`help-category-${category.id}`}
                  className="scroll-mt-24"
                  aria-labelledby={`help-category-heading-${category.id}`}
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h2 id={`help-category-heading-${category.id}`} className="font-serif text-2xl font-semibold">
                        {category.title}
                      </h2>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {category.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="mt-1 shrink-0">
                      {category.guides.length} {category.guides.length === 1 ? "guide" : "guides"}
                    </Badge>
                  </div>
                  <HelpGuideAccordion
                    guides={category.guides}
                    showJourneySteps={audience === "owner"}
                  />
                </section>
              ))}

              <FaqSection items={results.faqs} />
            </main>
          </div>
        </>
      )}

      <section className="mt-14 rounded-2xl border bg-card p-6 md:p-8" aria-labelledby="help-support-heading">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-primary">
              <Mail className="h-5 w-5" aria-hidden />
              <h2 id="help-support-heading" className="font-serif text-xl font-semibold text-foreground">Contact support</h2>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Contact the business for an order, delivery, appointment, or refund-policy question. Contact {platformSupportContact.providerName} for sign-in, account, payment-status, or site problems.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="default"
              className="gap-2"
              onClick={() => setReportOpen(true)}
              data-testid="button-help-report-problem"
            >
              <Flag className="h-4 w-4" aria-hidden />
              Report a problem
            </Button>
            <a
              href={`mailto:${platformSupportContact.email}`}
              className="inline-flex items-center justify-center rounded-lg border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted/60"
              data-testid="link-platform-support-email"
            >
              {platformSupportContact.email}
            </a>
          </div>
        </div>
        {fabDismissed ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Floating report button is hidden.{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => setReportFabDismissed(false)}
              data-testid="button-help-show-report-fab"
            >
              Show floating report button
            </button>
          </p>
        ) : null}
      </section>

      <ReportProblemSheet open={reportOpen} onOpenChange={setReportOpen} />

      <div className="mt-8 rounded-2xl border border-dashed bg-muted/30 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Ready to get started?{" "}
          <Link href="/businesses" className="font-medium text-primary hover:underline">Browse businesses</Link>
          {" "}or{" "}
          <Link href="/list-your-business" className="font-medium text-primary hover:underline">list your business</Link>.
        </p>
      </div>
    </div>
  );
}
