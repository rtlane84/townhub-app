import { useEffect, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import { useUser } from "@clerk/react";
import {
  SupportReportCategory,
  useSubmitSupportReport,
  type SupportReportInput,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const MESSAGE_MAX = 2000;

const CATEGORY_OPTIONS: { value: SupportReportCategory; label: string }[] = [
  { value: SupportReportCategory.BUG, label: "Bug" },
  { value: SupportReportCategory.QUESTION, label: "Question" },
  { value: SupportReportCategory.OTHER, label: "Other" },
];

function clerkPrimaryEmail(
  user: ReturnType<typeof useUser>["user"],
): string {
  return user?.primaryEmailAddress?.emailAddress?.trim() ?? "";
}

type ReportProblemSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ReportProblemSheet({
  open,
  onOpenChange,
}: ReportProblemSheetProps) {
  const [location] = useLocation();
  const { user } = useUser();
  const { toast } = useToast();
  const [category, setCategory] = useState<SupportReportCategory>(
    SupportReportCategory.BUG,
  );
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const signedInEmail = clerkPrimaryEmail(user);

  useEffect(() => {
    if (!open) return;
    if (signedInEmail) setContactEmail(signedInEmail);
  }, [open, signedInEmail]);

  const submitReport = useSubmitSupportReport({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Report sent",
          description: "Thanks — we’ll look into it.",
        });
        setMessage("");
        setCategory(SupportReportCategory.BUG);
        setFormError(null);
        onOpenChange(false);
      },
      onError: (err) => {
        const description =
          err instanceof Error && err.message.trim()
            ? err.message
            : "Could not send your report. Please try again.";
        setFormError(description);
      },
    },
  });

  function resetAndClose(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setFormError(null);
      setMessage("");
      setCategory(SupportReportCategory.BUG);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed) {
      setFormError("Please describe the problem.");
      return;
    }
    if (trimmed.length > MESSAGE_MAX) {
      setFormError(`Keep your message under ${MESSAGE_MAX} characters.`);
      return;
    }

    const email = contactEmail.trim();
    const payload: SupportReportInput = {
      category,
      message: trimmed,
      pagePath: location.split("?")[0] || "/",
      userAgent:
        typeof navigator !== "undefined"
          ? navigator.userAgent.slice(0, 500)
          : undefined,
    };
    if (email) payload.contactEmail = email;

    setFormError(null);
    submitReport.mutate({ data: payload });
  }

  return (
    <Sheet open={open} onOpenChange={resetAndClose}>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[min(92dvh,40rem)] overflow-y-auto sm:max-w-lg"
      >
        <SheetHeader className="text-left">
          <SheetTitle>Report a problem</SheetTitle>
          <SheetDescription>
            Tell us about a TownHub platform issue. For order, delivery, appointment, or refund
            questions, contact the business first.
          </SheetDescription>
        </SheetHeader>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-2">
            <Label htmlFor="report-category">Category</Label>
            <Select
              value={category}
              onValueChange={(value) =>
                setCategory(value as SupportReportCategory)
              }
            >
              <SelectTrigger id="report-category">
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-message">What went wrong?</Label>
            <Textarea
              id="report-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={MESSAGE_MAX}
              rows={5}
              placeholder="A short description helps us reproduce the issue."
              required
            />
            <p className="text-xs text-muted-foreground">
              {message.trim().length}/{MESSAGE_MAX}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="report-email">Contact email (optional)</Label>
            <Input
              id="report-email"
              type="email"
              autoComplete="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}

          <SheetFooter className="gap-2 sm:space-x-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => resetAndClose(false)}
              disabled={submitReport.isPending}
            >
              Cancel
            </Button>
            <LoadingButton type="submit" loading={submitReport.isPending}>
              Send report
            </LoadingButton>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
