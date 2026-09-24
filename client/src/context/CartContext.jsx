// src/context/CartContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";

const CartContext = createContext();
export const useCart = () => useContext(CartContext);

// api base from env with local fallback
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";

export const CartProvider = ({ children, userId }) => {
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(false);

  // load the cart from the backend
  const fetchCart = useCallback(async () => {
    if (!userId) {
      setCart({ items: [] });
      return;
    }
    try {
      const res = await axios.get(`${API_BASE}/api/cart/${userId}`);
      if (res.data.success) {
        setCart(res.data.cart || { items: [] });
      }
    } catch (err) {
      console.error("Error fetching cart:", err);
    }
  }, [userId]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // throws on failure so callers can show an error toast
  const addToCart = async (product, quantity = 1) => {
    if (!userId) throw new Error("Not signed in");
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/cart/add`, {
        userId,
        productId: product._id || product.id,
        quantity,
      });
      if (!res.data.success) {
        throw new Error(res.data.message || "Add to cart failed");
      }
      setCart(res.data.cart);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, quantity) => {
    if (!userId) return;
    try {
      const res = await axios.put(`${API_BASE}/api/cart/update`, {
        userId,
        productId,
        quantity,
      });
      if (res.data.success) setCart(res.data.cart);
    } catch (err) {
      console.error("Error updating quantity:", err);
    }
  };

  const removeFromCart = async (productId) => {
    if (!userId) return;
    try {
      const res = await axios.delete(`${API_BASE}/api/cart/remove`, {
        data: { userId, productId },
      });
      if (res.data.success) setCart(res.data.cart);
    } catch (err) {
      console.error("Error removing from cart:", err);
    }
  };

  // clear the cart on the server and locally
  const clearCart = async () => {
    if (!userId) return;
    try {
      await axios.delete(`${API_BASE}/api/cart/clear`, {
        data: { userId },
      });
      setCart({ items: [] });
    } catch (err) {
      console.error("Error clearing cart:", err);
    }
  };

  const totalPrice = (cart?.items || []).reduce(
    (acc, item) => acc + (item.product?.price || 0) * item.quantity,
    0
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalPrice,
        loading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};