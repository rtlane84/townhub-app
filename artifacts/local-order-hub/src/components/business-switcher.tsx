import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useSelectedBusiness } from "@/hooks/selected-business-context";
import { formatBusinessTypeLabel } from "@workspace/api-zod";

export function BusinessSwitcher({ compact }: { compact?: boolean }) {
  const { selectedBusinessId, ownedBusinesses, business, selectBusiness } = useSelectedBusiness();

  if (ownedBusinesses.length <= 1) {
    if (!business) return null;
    return (
      <div className={cn("rounded-lg border bg-background px-3 py-2", compact ? "text-xs" : "text-sm")}>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Current business</p>
        <p className="font-semibold truncate">{business.name}</p>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-between gap-2 h-auto py-2", compact ? "text-xs" : "text-sm")}
          aria-label="Switch business"
        >
          <span className="flex items-center gap-2 min-w-0 text-left">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                Current business
              </span>
              <span className="block font-semibold truncate">{business?.name ?? "Select business"}</span>
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Your businesses</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ownedBusinesses.map((item) => (
          <DropdownMenuItem
            key={item.id}
            className="flex items-start gap-2 cursor-pointer"
            onClick={() => selectBusiness(item.id)}
          >
            <Check
              className={cn(
                "h-4 w-4 mt-0.5 shrink-0",
                item.id === selectedBusinessId ? "opacity-100" : "opacity-0",
              )}
            />
            <span className="min-w-0">
              <span className="block font-medium truncate">{item.name}</span>
              <span className="block text-xs text-muted-foreground">{formatBusinessTypeLabel(item.type)}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
