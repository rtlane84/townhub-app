import { ExternalLink, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatWebsiteDisplay, normalizeWebsiteUrl } from "@workspace/api-zod";

type Props = {
  websiteUrl?: string | null;
  className?: string;
};

export function BusinessWebsiteCard({ websiteUrl, className }: Props) {
  const href = normalizeWebsiteUrl(websiteUrl);
  if (!href) return null;

  return (
    <div className={className}>
      <div className="rounded-lg border border-primary/15 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <Globe className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Visit our website</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{formatWebsiteDisplay(href)}</p>
            <Button asChild size="sm" variant="outline" className="mt-3 rounded-full">
              <a href={href} target="_blank" rel="noopener noreferrer" data-testid="link-business-website">
                Open website
                <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
