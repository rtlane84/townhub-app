import { Link } from "wouter";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { HelpTopic } from "@/lib/help-content";
import { cn } from "@/lib/utils";

type Props = {
  topic: HelpTopic;
  showStep?: boolean;
  className?: string;
};

export function HelpTopicCard({ topic, showStep = false, className }: Props) {
  return (
    <Card
      id={`help-${topic.id}`}
      className={cn(
        "h-full scroll-mt-24 transition-shadow hover:shadow-md",
        className,
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {showStep && topic.journeyStep != null && (
            <Badge
              variant="outline"
              className="h-8 w-8 shrink-0 rounded-full p-0 flex items-center justify-center font-semibold text-primary border-primary/30"
            >
              {topic.journeyStep}
            </Badge>
          )}
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg font-serif leading-snug">{topic.title}</CardTitle>
            <CardDescription className="mt-1.5 leading-relaxed">{topic.summary}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {topic.highlights.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
        {topic.link && (
          <Link href={topic.link.href}>
            <Button variant="outline" size="sm" className="gap-1.5">
              {topic.link.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
