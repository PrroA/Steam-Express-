import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

// 建立購物車 Context
type CartItem = {
  id: number | string;
  [key: string]: any;
};

type CartContextValue = {
  cart: CartItem[];
  addToCart: (game: CartItem) => void;
  removeFromCart: (id: CartItem['id']) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (game) => {
    setCart((prevCart) => [...prevCart, game]);
  };

  const removeFromCart = (id) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart }}>
      {children}
    </CartContext.Provider>
  );
}

// 自定義 Hook，方便使用 CartContext
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart 必須在 CartProvider 內使用');
  }
  return context;
};
