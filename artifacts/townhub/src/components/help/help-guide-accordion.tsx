import { Link } from "wouter";
import { ArrowRight, Info, Route } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { HelpGuide } from "@/lib/help-content";

type Props = {
  guides: HelpGuide[];
  showJourneySteps?: boolean;
};

export function HelpGuideAccordion({ guides, showJourneySteps = false }: Props) {
  return (
    <Accordion type="multiple" className="space-y-3">
      {guides.map((guide) => (
        <AccordionItem
          key={guide.id}
          value={guide.id}
          id={`help-guide-${guide.id}`}
          className="scroll-mt-28 rounded-2xl border bg-card px-4 shadow-sm transition-shadow data-[state=open]:shadow-md sm:px-5"
          data-testid={`help-guide-${guide.id}`}
        >
          <AccordionTrigger className="gap-4 py-4 hover:no-underline sm:py-5">
            <span className="flex min-w-0 items-start gap-3 text-left">
              {showJourneySteps && guide.journeyStep != null ? (
                <Badge
                  variant="outline"
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-primary/30 p-0 text-primary"
                  aria-label={`Setup step ${guide.journeyStep}`}
                >
                  {guide.journeyStep}
                </Badge>
              ) : (
                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Route className="h-3.5 w-3.5" aria-hidden />
                </span>
              )}
              <span className="min-w-0">
                <span className="block font-serif text-base font-semibold leading-snug text-foreground sm:text-lg">
                  {guide.title}
                </span>
                <span className="mt-1 block text-sm font-normal leading-relaxed text-muted-foreground">
                  {guide.summary}
                </span>
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-5 pl-0 sm:pl-11">
            <ol className="space-y-3">
              {guide.steps.map((step, index) => (
                <li key={step} className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>

            {guide.note ? (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-primary/15 bg-primary/5 p-3 text-sm leading-relaxed text-foreground/80">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <p>{guide.note}</p>
              </div>
            ) : null}

            {guide.link ? (
              <div className="mt-4">
                <Link href={guide.link.href}>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    {guide.link.label}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </Link>
              </div>
            ) : null}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
