import { cn } from "@/lib/utils";

export function PlatformSection({
  title,
  description,
  children,
  testId,
  id,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  testId?: string;
  id?: string;
}) {
  return (
    <section className="space-y-4 scroll-mt-24" data-testid={testId} id={id ?? testId}>
      <div className="border-b pb-2">
        <h2 className="font-serif text-2xl font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function PlatformHealthGrid({ children }: { children: React.ReactNode }) {
  return <div className={cn("grid grid-cols-1 lg:grid-cols-2 gap-4")}>{children}</div>;
}

export function CompactSectionCard({
  title,
  description,
  icon: Icon,
  children,
  testId,
  className,
}: {
  title: string;
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
  testId?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border bg-card", className)} data-testid={testId}>
      <div className="px-4 py-3 border-b flex items-start gap-2">
        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="min-w-0">
          <h3 className="font-medium text-sm">{title}</h3>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="px-4 py-3">{children}</div>
    </div>
  );
}
