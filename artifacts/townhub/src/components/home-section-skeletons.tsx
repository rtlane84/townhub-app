import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function BusinessListingCardSkeleton() {
  return (
    <Card className="h-full border-border/50 overflow-hidden">
      <Skeleton className="h-40 w-full rounded-none" />
      <CardContent className="space-y-3 px-6 pb-6 pt-10">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export function EventCardSkeleton() {
  return (
    <Card className="h-full border-border/50">
      <Skeleton className="h-36 w-full rounded-t-xl rounded-b-none" />
      <CardContent className="space-y-2 p-4">
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-full" />
      </CardContent>
    </Card>
  );
}

export function HighlightCardSkeleton() {
  return (
    <div className="flex gap-3 items-start rounded-xl border border-border/50 bg-white p-4">
      <Skeleton className="h-16 w-16 shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
      </div>
    </div>
  );
}

export function QuickTownInfoCardSkeleton() {
  return (
    <Card className="flex h-full flex-col border-border/50 shadow-sm">
      <CardContent className="flex flex-1 flex-col p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-auto h-8 w-32 rounded-full" />
      </CardContent>
    </Card>
  );
}

export function HomeFeaturedBusinessesSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: count }).map((_, index) => (
        <BusinessListingCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function HomeEventsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <EventCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function FoodTruckCardSkeleton() {
  return (
    <Card className="border-primary/20">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start gap-3">
          <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function HomeFoodTrucksSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <FoodTruckCardSkeleton key={index} />
      ))}
    </div>
  );
}
