import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Flag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportProblemSheet } from "@/components/report-problem-sheet";
import {
  isReportFabDismissed,
  REPORT_FAB_VISIBILITY_EVENT,
  setReportFabDismissed,
} from "@/lib/report-problem-fab-dismiss";
import { isCustomerFacingReportRoute } from "@/lib/report-problem-route";
import { cn } from "@/lib/utils";

export function ReportProblemFab() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(() => isReportFabDismissed());

  const onCustomerRoute = isCustomerFacingReportRoute(location);

  useEffect(() => {
    const sync = () => setDismissed(isReportFabDismissed());
    window.addEventListener(REPORT_FAB_VISIBILITY_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(REPORT_FAB_VISIBILITY_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!onCustomerRoute && open) setOpen(false);
  }, [onCustomerRoute, open]);

  if (!onCustomerRoute || dismissed) return null;

  return (
    <>
      <div
        className={cn(
          "fixed z-[90] print:hidden",
          "bottom-[calc(1rem+var(--native-bottom-tab-height,0px)+env(safe-area-inset-bottom,0px))] right-4 md:right-6",
        )}
      >
        <div className="relative">
          <Button
            type="button"
            variant="default"
            size="icon"
            onClick={() => setOpen(true)}
            className="h-11 w-11 rounded-full text-primary-foreground shadow-md"
            aria-label="Report a problem"
          >
            <Flag className="h-5 w-5" aria-hidden />
          </Button>
          <button
            type="button"
            onClick={() => setReportFabDismissed(true)}
            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border/70 bg-background text-muted-foreground shadow-sm hover:bg-muted hover:text-foreground"
            aria-label="Hide report button"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </div>
      </div>

      <ReportProblemSheet open={open} onOpenChange={setOpen} />
    </>
  );
}
