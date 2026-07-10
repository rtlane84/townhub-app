import { useState } from "react";
import { Check, Copy, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { buildPublicStorefrontUrl } from "@/lib/storefront-url";
import { cn } from "@/lib/utils";

const SETTINGS_HELP =
  "This is your business's public web address. It stays the same even if you rename your business, so you don't have to update links you've already shared.";

const SUPPORT_NOTE =
  "Need to change your storefront link? Contact TownHub support and we'll be happy to help.";

type StorefrontUrlFieldProps = {
  slug: string;
  className?: string;
};

export function StorefrontUrlField({ slug, className }: StorefrontUrlFieldProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const fullUrl = buildPublicStorefrontUrl(slug);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast({ title: "Link copied", description: "Your storefront link was copied to your clipboard." });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Could not copy",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-sm font-medium mb-1.5 block">Storefront URL</label>
      <div className="flex gap-2">
        <Input
          readOnly
          value={fullUrl}
          className="font-mono text-sm bg-muted/40"
          data-testid="input-storefront-url"
          onFocus={(e) => e.target.select()}
        />
        <Button
          type="button"
          variant="outline"
          className="shrink-0"
          onClick={() => void handleCopy()}
          data-testid="button-copy-storefront-url"
        >
          {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
          Copy Link
        </Button>
      </div>
      <p className="text-xs text-muted-foreground flex gap-1.5 leading-relaxed">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span className="min-w-0">{SETTINGS_HELP}</span>
      </p>
      <p className="text-xs text-muted-foreground/80 leading-relaxed">{SUPPORT_NOTE}</p>
    </div>
  );
}

export const STOREFRONT_URL_APPLY_HELP =
  "This public URL is created from your business name and will normally remain the same even if you rename your business later.";

export { SUPPORT_NOTE as STOREFRONT_URL_SUPPORT_NOTE };
