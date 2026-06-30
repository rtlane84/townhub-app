import { createContext, useContext, useEffect, useState } from "react";
import { Product } from "@workspace/api-client-react";
import { buildCartLineKey, type SelectedCartOption } from "@/components/product-options-dialog";

export interface CartItem extends Product {
  quantity: number;
  lineKey: string;
  unitPrice: number;
  selectedOptionIds: number[];
  selectedOptions: SelectedCartOption[];
}

interface CartState {
  businessId: number | null;
  items: CartItem[];
}

interface AddToCartOptions {
  quantity?: number;
  selectedOptionIds?: number[];
  selectedOptions?: SelectedCartOption[];
  unitPrice?: number;
}

interface CartContextType {
  cart: CartState;
  addToCart: (product: Product, businessId: number, options?: AddToCartOptions) => void;
  removeFromCart: (lineKey: string) => void;
  updateQuantity: (lineKey: string, quantity: number) => void;
  clearCart: () => void;
  clearCartForBusiness: (businessId: number) => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function normalizeCartItem(product: Product, quantity: number, options?: AddToCartOptions): CartItem {
  const selectedOptionIds = options?.selectedOptionIds ?? [];
  const selectedOptions = options?.selectedOptions ?? [];
  const unitPrice = options?.unitPrice ?? product.price;
  return {
    ...product,
    quantity,
    lineKey: buildCartLineKey(product.id, selectedOptionIds),
    unitPrice,
    selectedOptionIds,
    selectedOptions,
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartState>(() => {
    const saved = localStorage.getItem("local-order-hub-cart");
    if (!saved) return { businessId: null, items: [] };
    try {
      const parsed = JSON.parse(saved) as CartState;
      return {
        businessId: parsed.businessId,
        items: (parsed.items ?? []).map((item) => ({
          ...item,
          lineKey: item.lineKey ?? buildCartLineKey(item.id, item.selectedOptionIds ?? []),
          unitPrice: item.unitPrice ?? item.price,
          selectedOptionIds: item.selectedOptionIds ?? [],
          selectedOptions: item.selectedOptions ?? [],
        })),
      };
    } catch {
      return { businessId: null, items: [] };
    }
  });

  useEffect(() => {
    localStorage.setItem("local-order-hub-cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product, businessId: number, options?: AddToCartOptions) => {
    const quantity = options?.quantity ?? 1;
    const line = normalizeCartItem(product, quantity, options);

    setCart((prev) => {
      if (prev.businessId !== null && prev.businessId !== businessId) {
        if (!window.confirm("You have items from another business in your cart. Clear it and start fresh?")) {
          return prev;
        }
        return {
          businessId,
          items: [line],
        };
      }

      const existing = prev.items.find((item) => item.lineKey === line.lineKey);
      if (existing) {
        return {
          ...prev,
          businessId,
          items: prev.items.map((item) =>
            item.lineKey === line.lineKey
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          ),
        };
      }

      return {
        businessId,
        items: [...prev.items, line],
      };
    });
  };

  const removeFromCart = (lineKey: string) => {
    setCart((prev) => {
      const newItems = prev.items.filter((item) => item.lineKey !== lineKey);
      return {
        businessId: newItems.length === 0 ? null : prev.businessId,
        items: newItems,
      };
    });
  };

  const updateQuantity = (lineKey: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(lineKey);
      return;
    }
    setCart((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.lineKey === lineKey ? { ...item, quantity } : item,
      ),
    }));
  };

  const clearCart = () => {
    setCart({ businessId: null, items: [] });
  };

  const clearCartForBusiness = (businessId: number) => {
    setCart((prev) => {
      if (prev.businessId !== businessId) return prev;
      return { businessId: null, items: [] };
    });
  };

  const total = cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, clearCartForBusiness, total, itemCount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
