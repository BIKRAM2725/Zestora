// src/pages/CartPage.jsx
import React from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { FaTrashAlt } from "react-icons/fa";

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, totalPrice } = useCart();
  const items = cart?.items || [];

  // empty state points the person back to shopping
  if (!items.length) {
    return (
      <div className="flex flex-col justify-center items-center h-[calc(100vh-80px)] gap-4 px-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Your cart is empty</h1>
        <p className="text-gray-500">Add a few products and they will show up here.</p>
        <Link
          to="/"
          className="px-6 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  const itemCount = items.reduce((n, i) => n + i.quantity, 0);

  // keep quantity between 1 and the available stock when known
  const setQty = (item, next) => {
    const max = item.product?.stock ?? item.product?.totalQuantity ?? Infinity;
    const q = Math.min(Math.max(1, next), max > 0 ? max : 1);
    if (q !== item.quantity) updateQuantity(item.product._id, q);
  };

  return (
    <div className="max-w-6xl mx-auto mt-8 px-4 sm:px-6 lg:px-8 pb-12">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
        Your cart <span className="text-gray-400 font-medium text-lg">({itemCount} items)</span>
      </h1>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* item list */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {items.map((item) => {
            const max = item.product?.stock ?? item.product?.totalQuantity ?? Infinity;
            return (
              <div
                key={item.product._id}
                className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100"
              >
                <img
                  src={item.product.images?.[0] || "/placeholder.jpg"}
                  alt={item.product.title}
                  className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl bg-gray-50 flex-shrink-0"
                />

                <div className="flex-1 min-w-0 flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-semibold text-gray-900 truncate">{item.product.title}</h2>
                    <button
                      onClick={() => removeFromCart(item.product._id)}
                      aria-label="Remove item"
                      className="text-gray-400 hover:text-red-600 p-1"
                    >
                      <FaTrashAlt />
                    </button>
                  </div>

                  <p className="text-sm text-gray-500 mt-1">₹ {item.product.price} each</p>

                  <div className="mt-auto pt-3 flex items-center justify-between">
                    <div className="inline-flex items-center rounded-xl border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => setQty(item, item.quantity - 1)}
                        disabled={item.quantity <= 1}
                        aria-label="Decrease quantity"
                        className="w-9 h-9 hover:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed"
                      >
                        −
                      </button>
                      <span className="w-9 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => setQty(item, item.quantity + 1)}
                        disabled={item.quantity >= max}
                        aria-label="Increase quantity"
                        className="w-9 h-9 hover:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>

                    <div className="text-lg font-extrabold text-red-600">
                      ₹ {item.product.price * item.quantity}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* summary card */}
        <aside className="lg:sticky lg:top-24 h-fit p-6 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Order summary</h2>

          <div className="mt-4 space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹ {totalPrice}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>Calculated at checkout</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-lg font-extrabold text-gray-900">
            <span>Total</span>
            <span>₹ {totalPrice}</span>
          </div>

          <Link
            to="/checkout"
            className="mt-6 block w-full text-center px-6 py-3.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 shadow-md shadow-red-200"
          >
            Go to checkout
          </Link>
          <Link to="/" className="mt-3 block text-center text-sm text-gray-500 hover:text-gray-800">
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}