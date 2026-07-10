import { Link } from "wouter";
import { Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function NoActiveBusinessEmptyState() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6 md:p-10">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Store className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="font-serif text-xl">You don&apos;t have an active business yet.</CardTitle>
          <CardDescription>
            Apply to list your business on Town Hub. Once approved, you can complete subscription setup and manage orders from here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/list-your-business">Apply to list your business</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
