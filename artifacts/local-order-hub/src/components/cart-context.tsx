import { createContext, useContext, useEffect, useState } from "react";
import { Product, OrderItemInput } from "@workspace/api-client-react";

interface CartItem extends Product {
  quantity: number;
}

interface CartState {
  businessId: number | null;
  items: CartItem[];
}

interface CartContextType {
  cart: CartState;
  addToCart: (product: Product, businessId: number, quantity?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartState>(() => {
    const saved = localStorage.getItem("local-order-hub-cart");
    return saved ? JSON.parse(saved) : { businessId: null, items: [] };
  });

  useEffect(() => {
    localStorage.setItem("local-order-hub-cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product, businessId: number, quantity = 1) => {
    setCart((prev) => {
      // If adding from a different business, clear cart or prompt
      if (prev.businessId !== null && prev.businessId !== businessId) {
        if (!window.confirm("You have items from another business in your cart. Clear it and start fresh?")) {
          return prev;
        }
        return {
          businessId,
          items: [{ ...product, quantity }],
        };
      }

      const existing = prev.items.find((item) => item.id === product.id);
      if (existing) {
        return {
          ...prev,
          businessId,
          items: prev.items.map((item) =>
            item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
          ),
        };
      }

      return {
        businessId,
        items: [...prev.items, { ...product, quantity }],
      };
    });
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => {
      const newItems = prev.items.filter((item) => item.id !== productId);
      return {
        businessId: newItems.length === 0 ? null : prev.businessId,
        items: newItems,
      };
    });
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === productId ? { ...item, quantity } : item
      ),
    }));
  };

  const clearCart = () => {
    setCart({ businessId: null, items: [] });
  };

  const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQuantity, clearCart, total, itemCount }}>
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
