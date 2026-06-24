import { useRoute } from "wouter";
import { useGetBusinessBySlug } from "@workspace/api-client-react";
import { MapPin, Clock, Phone, Store, ShoppingBag, Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/components/cart-context";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useState } from "react";

export default function Storefront() {
  const [, params] = useRoute("/businesses/:slug");
  const slug = params?.slug || "";
  const { data: storefront, isLoading, error } = useGetBusinessBySlug(slug, {
    query: { enabled: !!slug, queryKey: ['/api/businesses', slug] }
  });
  
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-64 bg-muted w-full" />
        <div className="container mx-auto px-4 -mt-16 relative z-10 max-w-6xl">
          <div className="flex gap-8">
            <div className="w-1/3">
              <Skeleton className="h-96 w-full rounded-xl" />
            </div>
            <div className="w-2/3 mt-20">
              <Skeleton className="h-10 w-1/2 mb-4" />
              <div className="grid grid-cols-2 gap-4 mt-8">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !storefront) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-lg">
        <Store className="h-16 w-16 mx-auto text-muted-foreground opacity-30 mb-4" />
        <h1 className="text-2xl font-serif font-bold mb-2">Business not found</h1>
        <p className="text-muted-foreground mb-6">We couldn't find the storefront you're looking for.</p>
        <Link href="/businesses">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Directory</Button>
        </Link>
      </div>
    );
  }

  const { business, categories, products } = storefront;
  
  const displayedProducts = activeCategory 
    ? products.filter(p => p.categoryId === activeCategory)
    : products;

  const handleAddToCart = (product: any) => {
    addToCart(product, business.id, 1);
    toast({
      title: "Added to cart",
      description: `${product.name} added to your cart.`,
    });
  };

  return (
    <div className="min-h-screen bg-muted/10 pb-20">
      <div className="h-64 md:h-80 w-full bg-muted relative">
        {business.heroImageUrl ? (
          <img src={business.heroImageUrl} alt={business.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-primary/10 flex items-center justify-center">
            <Store className="h-20 w-20 text-primary/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      <div className="container mx-auto px-4 -mt-20 md:-mt-24 relative z-10 max-w-6xl">
        <div className="flex flex-col md:flex-row gap-8">
          
          <div className="md:w-1/3 lg:w-1/4 flex-shrink-0">
            <Card className="sticky top-24 shadow-xl border-border/40 overflow-hidden">
              <div className="p-6 bg-white flex flex-col items-center text-center border-b">
                <div className="w-24 h-24 bg-white rounded-full p-1 shadow-md -mt-16 mb-4 relative z-20">
                  {business.logoUrl ? (
                    <img src={business.logoUrl} alt="Logo" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-muted flex items-center justify-center">
                      <Store className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <h1 className="text-2xl font-serif font-bold text-foreground mb-1">{business.name}</h1>
                <p className="text-sm text-muted-foreground mb-4">{business.type.replace('_', ' ')}</p>
                <div className="flex flex-wrap justify-center gap-2 mb-2">
                  {!business.active && <Badge variant="secondary">Closed</Badge>}
                  {business.pickupEnabled && <Badge variant="outline" className="border-primary text-primary">Pickup</Badge>}
                  {business.deliveryEnabled && <Badge variant="outline" className="border-blue-500 text-blue-600">Delivery</Badge>}
                </div>
              </div>
              
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {business.description && (
                    <div className="p-5 text-sm text-foreground/90 leading-relaxed">
                      {business.description}
                    </div>
                  )}
                  
                  <div className="p-5 space-y-4">
                    {business.address && (
                      <div className="flex items-start gap-3 text-sm">
                        <MapPin className="h-4 w-4 text-primary mt-0.5" />
                        <span className="text-foreground/80">{business.address}</span>
                      </div>
                    )}
                    {business.phone && (
                      <div className="flex items-start gap-3 text-sm">
                        <Phone className="h-4 w-4 text-primary mt-0.5" />
                        <span className="text-foreground/80">{business.phone}</span>
                      </div>
                    )}
                    {business.hours && (
                      <div className="flex items-start gap-3 text-sm">
                        <Clock className="h-4 w-4 text-primary mt-0.5" />
                        <span className="text-foreground/80 whitespace-pre-line">{business.hours}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:w-2/3 lg:w-3/4 md:mt-24">
            {categories.length > 0 && (
              <div className="flex overflow-x-auto pb-4 mb-4 gap-2 hide-scrollbar sticky top-16 z-30 bg-muted/10 py-2 -mx-4 px-4 md:mx-0 md:px-0">
                <Button
                  variant={activeCategory === null ? "default" : "outline"}
                  onClick={() => setActiveCategory(null)}
                  className="rounded-full whitespace-nowrap"
                  size="sm"
                >
                  All Items
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={activeCategory === cat.id ? "default" : "outline"}
                    onClick={() => setActiveCategory(cat.id)}
                    className="rounded-full whitespace-nowrap bg-white hover:bg-muted"
                    size="sm"
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            )}

            {displayedProducts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-dashed border-border">
                <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                <h3 className="text-lg font-medium text-foreground">No products found</h3>
                <p className="text-muted-foreground text-sm mt-1">This category is empty.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {displayedProducts.map((product) => (
                  <Card key={product.id} className="overflow-hidden flex flex-col border-border/40 shadow-sm hover:shadow-md transition-shadow">
                    {product.imageUrl && (
                      <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                        <img 
                          src={product.imageUrl} 
                          alt={product.name} 
                          className="w-full h-full object-cover hover:scale-105 transition-transform" 
                        />
                      </div>
                    )}
                    <CardContent className="p-4 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <h4 className="font-medium leading-tight text-foreground">{product.name}</h4>
                        <span className="font-semibold text-primary shrink-0">${product.price.toFixed(2)}</span>
                      </div>
                      
                      {product.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                          {product.description}
                        </p>
                      )}
                      
                      <div className="mt-auto pt-4 flex items-center justify-between">
                        {product.prepTimeMinutes ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {product.prepTimeMinutes}m
                          </span>
                        ) : <span />}
                        
                        <Button 
                          size="sm" 
                          variant="secondary"
                          className="rounded-full h-8"
                          onClick={() => handleAddToCart(product)}
                          disabled={!product.available || !business.active}
                        >
                          <Plus className="h-4 w-4 mr-1" /> Add
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
