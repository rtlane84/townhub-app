import { createContext, useContext, useEffect, useState } from "react";
import { Product } from "@workspace/api-client-react";
import { buildCartLineKey, type SelectedCartOption } from "@/components/product-options-dialog";
import {
  CLEAR_CART_FOR_OTHER_BUSINESS_MESSAGE,
  mergeCartAdd,
  needsClearCartConfirmation,
} from "@/lib/cart-business";
import { triggerAddToCartHaptic } from "@/lib/native-haptics";

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
  /** Returns false when the user cancels clearing another business's cart. */
  addToCart: (product: Product, businessId: number, options?: AddToCartOptions) => boolean;
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

  const addToCart = (product: Product, businessId: number, options?: AddToCartOptions): boolean => {
    if (product.available === false) {
      return false;
    }
    const quantity = options?.quantity ?? 1;
    const line = normalizeCartItem(product, quantity, options);

    // Confirm outside setState so cancel does not toast "added" and React stays pure.
    const needsConfirm = needsClearCartConfirmation(cart.businessId, businessId);
    const clearOtherBusinessConfirmed = needsConfirm
      ? window.confirm(CLEAR_CART_FOR_OTHER_BUSINESS_MESSAGE)
      : true;

    if (needsConfirm && !clearOtherBusinessConfirmed) {
      return false;
    }

    setCart((prev) => {
      const next = mergeCartAdd(prev, businessId, line, { clearOtherBusinessConfirmed });
      return next ?? prev;
    });
    triggerAddToCartHaptic();
    return true;
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
