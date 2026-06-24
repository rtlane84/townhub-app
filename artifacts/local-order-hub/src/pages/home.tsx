import { useListBusinesses } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Store, ArrowRight, Loader2, Leaf, Coffee, Utensils, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = [
  { name: "Food & Drink", type: "FOOD_VENDOR", icon: <Utensils className="h-5 w-5" /> },
  { name: "Flowers", type: "FLORIST", icon: <Leaf className="h-5 w-5 text-green-500" /> },
  { name: "Plants & Market", type: "GARDEN_MARKET", icon: <Store className="h-5 w-5 text-orange-500" /> },
  { name: "Retail & General", type: "RETAIL_STORE", icon: <Coffee className="h-5 w-5 text-blue-500" /> },
];

export default function Home() {
  const { data: businesses, isLoading } = useListBusinesses({ featured: true });

  return (
    <div className="flex flex-col min-h-screen">
      <section className="relative py-24 overflow-hidden bg-primary/5">
        <div className="container px-4 mx-auto relative z-10 text-center max-w-3xl">
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-foreground mb-6 leading-tight">
            Order Local. <br />
            <span className="text-primary">Support Local.</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
            Your town's best bakeries, florists, markets, and shops—all in one place. Fresh, local, and community-driven.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/businesses">
              <Button size="lg" className="w-full sm:w-auto text-lg h-14 px-8 rounded-full shadow-lg">
                Shop the Neighborhood
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-lg h-14 px-8 rounded-full bg-white">
                List Your Business
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="container px-4 mx-auto">
          <h2 className="text-3xl font-serif font-bold mb-8 text-center">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {CATEGORIES.map((cat) => (
              <Link key={cat.type} href={`/businesses?type=${cat.type}`}>
                <Card className="hover-elevate cursor-pointer transition-all border-border/50 group">
                  <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-full group-hover:scale-110 transition-transform">
                      {cat.icon}
                    </div>
                    <span className="font-medium text-foreground">{cat.name}</span>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-muted/20">
        <div className="container px-4 mx-auto">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-3xl font-serif font-bold text-foreground">Featured Local Favorites</h2>
            <Link href="/businesses" className="hidden sm:flex items-center text-primary font-medium hover:underline">
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {businesses?.slice(0, 6).map((business) => (
                <Link key={business.id} href={`/businesses/${business.slug}`}>
                  <Card className="h-full overflow-hidden hover-elevate cursor-pointer border-border/50 group transition-all">
                    <div className="aspect-[16/9] w-full bg-muted relative overflow-hidden">
                      {business.heroImageUrl ? (
                        <img 
                          src={business.heroImageUrl} 
                          alt={business.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-primary/5 text-primary/40">
                          <Store className="h-12 w-12" />
                        </div>
                      )}
                      {business.logoUrl && (
                        <div className="absolute -bottom-6 left-6 p-1 bg-white rounded-full shadow-md">
                          <img src={business.logoUrl} alt="Logo" className="w-12 h-12 rounded-full object-cover" />
                        </div>
                      )}
                    </div>
                    <CardContent className="pt-10 pb-6 px-6">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-serif font-bold text-foreground line-clamp-1">{business.name}</h3>
                        {!business.active && <Badge variant="secondary">Closed</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                        {business.description || "A local favorite."}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {business.pickupEnabled && <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Pickup</Badge>}
                        {business.deliveryEnabled && <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Delivery</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
          
          <div className="mt-8 text-center sm:hidden">
            <Link href="/businesses">
              <Button variant="outline" className="w-full">
                View all businesses
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
