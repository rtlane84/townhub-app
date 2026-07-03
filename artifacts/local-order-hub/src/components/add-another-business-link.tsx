import { Link } from "wouter";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  ADD_ANOTHER_BUSINESS_HREF,
  ADD_ANOTHER_BUSINESS_LABEL,
} from "@/lib/add-another-business";

export { ADD_ANOTHER_BUSINESS_HREF, ADD_ANOTHER_BUSINESS_LABEL };

type AddAnotherBusinessLinkProps = {
  className?: string;
  onNavigate?: () => void;
};

export function AddAnotherBusinessLink({ className, onNavigate }: AddAnotherBusinessLinkProps) {
  return (
    <Link
      href={ADD_ANOTHER_BUSINESS_HREF}
      onClick={onNavigate}
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline underline-offset-2",
        className,
      )}
      data-testid="link-add-another-business"
    >
      <PlusCircle className="h-4 w-4 shrink-0" aria-hidden />
      {ADD_ANOTHER_BUSINESS_LABEL}
    </Link>
  );
}

export function AddAnotherBusinessButton({ className, onNavigate }: AddAnotherBusinessLinkProps) {
  return (
    <Button asChild variant="outline" className={className} data-testid="button-add-another-business">
      <Link href={ADD_ANOTHER_BUSINESS_HREF} onClick={onNavigate}>
        <PlusCircle className="h-4 w-4 mr-2" aria-hidden />
        {ADD_ANOTHER_BUSINESS_LABEL}
      </Link>
    </Button>
  );
}

export function AddAnotherBusinessMenuItem({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <DropdownMenuItem asChild className="cursor-pointer">
      <Link
        href={ADD_ANOTHER_BUSINESS_HREF}
        onClick={onNavigate}
        className="flex items-center gap-2"
        data-testid="menu-add-another-business"
      >
        <PlusCircle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <span>{ADD_ANOTHER_BUSINESS_LABEL}</span>
      </Link>
    </DropdownMenuItem>
  );
}
