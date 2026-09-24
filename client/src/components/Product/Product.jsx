// src/components/Product.jsx
import React, { useState, useEffect } from "react";
import { useCart } from "../../context/CartContext";
import { useNavigate } from "react-router-dom";
import { MdLocalShipping } from "react-icons/md";
import { FaMoneyBillWave, FaStar } from "react-icons/fa";
import { ImUndo2 } from "react-icons/im";
import { toast } from "react-toastify";
import { useAuth } from "../../context/UserContext";
import axios from "axios";

// category badge styles
const CATEGORY_STYLE_MAP = {
  Electronics: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  Clothing: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  Beauty: "bg-pink-100 text-pink-800 ring-pink-200",
  Spices: "bg-amber-100 text-amber-800 ring-amber-200",
  Home: "bg-yellow-100 text-yellow-800 ring-yellow-200",
};
const fallbackStyles = [
  "bg-slate-100 text-slate-800 ring-slate-200",
  "bg-violet-100 text-violet-800 ring-violet-200",
  "bg-rose-100 text-rose-800 ring-rose-200",
  "bg-cyan-100 text-cyan-800 ring-cyan-200",
  "bg-orange-100 text-orange-800 ring-orange-200",
];
function hashToIndex(str, mod) {
  if (!str) return 0;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h) % mod;
}
const getCategoryClasses = (category) => {
  if (!category) return "bg-slate-100 text-slate-800 ring-slate-200";
  const name = typeof category === "string" ? category : category?.name || "";
  const mapped =
    CATEGORY_STYLE_MAP[name] ||
    CATEGORY_STYLE_MAP[name?.charAt(0)?.toUpperCase() + name?.slice(1)];
  if (mapped) return mapped;
  const idx = hashToIndex(String(name).toLowerCase(), fallbackStyles.length);
  return fallbackStyles[idx];
};

// api base url with local fallback
const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

// stock at or below this number shows a low stock warning
const LOW_STOCK_LIMIT = 5;

// star row used for both rating input and display
function Stars({ value = 0, onChange, size = 16 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange && onChange(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          className={`${onChange ? "cursor-pointer" : "cursor-default"} focus:outline-none`}
        >
          <FaStar size={size} className={n <= value ? "text-amber-400" : "text-gray-300"} />
        </button>
      ))}
    </div>
  );
}

export default function Product({ product }) {
  const title = product?.name || product?.title || "Untitled Product";
  const price = product?.price ?? 0;
  const stock = product?.totalQuantity ?? product?.stock ?? 0;
  const images =
    product?.images && product.images.length ? product.images : ["/placeholder.jpg"];
  const category = product?.category?.name || product?.category || "Uncategorized";
  const brand = product?.brand || product?.hotelLocation || "Zestora";
  const prodId = product?._id || product?.id;

  // out of stock when quantity is zero or the product is flagged unavailable
  const isOutOfStock = stock <= 0 || product?.isAvailable === false;
  const isLowStock = !isOutOfStock && stock <= LOW_STOCK_LIMIT;

  const [selectedImage, setSelectedImage] = useState(images[0]);
  const [auth] = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  // quantity picker state
  const [qty, setQty] = useState(1);

  // reviews state
  const [reviews, setReviews] = useState(product?.reviews || []);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewFile, setReviewFile] = useState(null);
  const [previewReviewUrl, setPreviewReviewUrl] = useState(null);
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    setReviews(product?.reviews || []);
    setSelectedImage((product?.images && product.images[0]) || "/placeholder.jpg");
    setQty(1);
  }, [product]);

  // free the preview blob url when it changes or the component unmounts
  useEffect(() => {
    return () => {
      if (previewReviewUrl) URL.revokeObjectURL(previewReviewUrl);
    };
  }, [previewReviewUrl]);

  const changeQty = (delta) => {
    setQty((q) => Math.min(Math.max(1, q + delta), Math.max(stock, 1)));
  };

  // shared guard for cart and buy actions
  const canProceed = (message) => {
    if (!auth?.user) {
      toast.warn(message);
      navigate("/login");
      return false;
    }
    if (isOutOfStock) {
      toast.error("Sorry, this product is out of stock.");
      return false;
    }
    if (qty > stock) {
      toast.error(`Only ${stock} left in stock.`);
      return false;
    }
    return true;
  };

  const handleAddToCart = async () => {
    if (!canProceed("Please sign in to add items to your cart.")) return;
    try {
      await addToCart(product, qty);
      // stay on the page so more products can be added
      toast.success("Added to cart!");
    } catch (err) {
      toast.error("Failed to add to cart!");
      console.error(err);
    }
  };

  const handleBuy = () => {
    if (!canProceed("Please sign in to buy items.")) return;
    // skip the cart and hand this single item to checkout
    navigate("/checkout", { state: { buyNow: { product, quantity: qty } } });
  };

  // review image selection and preview
  const onSelectReviewImage = (e) => {
    const f = e.target.files?.[0] ?? null;
    setReviewFile(f);
    setPreviewReviewUrl(f ? URL.createObjectURL(f) : null);
  };

  // display name from a review object
  const getReviewerName = (r) => {
    if (!r) return "Anonymous";
    if (r.username) return r.username;
    if (typeof r.user === "object" && r.user?.name) return r.user.name;
    if (typeof r.user === "string" && r.user.length < 30) return r.user;
    return r.user && typeof r.user === "string" ? "User" : "Anonymous";
  };

  // post the review to the backend
  const submitReview = async (e) => {
    e.preventDefault();
    if (!auth?.user) {
      toast.warn("Please sign in to add a review.");
      navigate("/login");
      return;
    }
    if (!prodId) {
      toast.error("Product ID not found.");
      return;
    }
    setSubmittingReview(true);

    try {
      const token =
        auth?.token ||
        (localStorage.getItem("auth") && JSON.parse(localStorage.getItem("auth")).token);
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      let res = null;
      if (reviewFile) {
        const fd = new FormData();
        fd.append("rating", rating);
        fd.append("comment", reviewText);
        fd.append("image", reviewFile);
        res = await axios.post(`${API}/api/review/${prodId}/review`, fd, {
          headers: { ...headers, "Content-Type": "multipart/form-data" },
        });
      } else {
        res = await axios.post(
          `${API}/api/review/${prodId}/review`,
          { rating, comment: reviewText },
          { headers }
        );
      }

      if (res?.data?.success || res?.status === 201 || res?.status === 200) {
        const saved = res?.data?.review || {
          rating,
          comment: reviewText,
          image: previewReviewUrl || null,
          username: auth.user?.name || auth.user?.username || "You",
          createdAt: new Date().toISOString(),
        };
        setReviews((r) => [saved, ...r]);
        setRating(5);
        setReviewText("");
        setReviewFile(null);
        setPreviewReviewUrl(null);
        toast.success("Review submitted, thank you!");
      } else {
        toast.error(res?.data?.message || "Failed to submit review");
      }
    } catch (err) {
      console.error("Review submit error:", err.response?.data || err.message);
      toast.error("Error submitting review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const catClasses = getCategoryClasses(category);
  const avgRating = reviews.length
    ? reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviews.length
    : 0;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pb-24 md:pb-10">
      <div className="max-w-6xl mx-auto mt-6 p-4 sm:p-8 rounded-3xl shadow-xl bg-white ring-1 ring-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {/* left column: gallery */}
          <div className="flex flex-col">
            <div className="relative w-full h-[320px] md:h-[440px] bg-gray-50 rounded-2xl overflow-hidden mb-4 flex items-center justify-center ring-1 ring-gray-100">
              <img
                src={selectedImage}
                alt={title}
                className={`max-w-full max-h-full object-contain transition ${
                  isOutOfStock ? "opacity-60 grayscale" : ""
                }`}
              />
              {/* out of stock overlay badge */}
              {isOutOfStock && (
                <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-gray-900 text-white text-xs font-semibold">
                  Out of stock
                </span>
              )}
            </div>

            {/* thumbnails scroll sideways on small screens */}
            <div className="flex gap-3 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  onClick={() => setSelectedImage(img)}
                  className={`flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
                    selectedImage === img ? "border-red-500" : "border-transparent ring-1 ring-gray-200"
                  }`}
                >
                  <img src={img} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* right column: details */}
          <div className="flex flex-col">
            <span
              className={`self-start px-3 py-1 rounded-full text-xs font-medium ring-1 ${catClasses}`}
            >
              {category}
            </span>

            <h1 className="mt-3 text-2xl sm:text-4xl font-extrabold text-gray-900 leading-tight">
              {title}
            </h1>

            {/* rating summary */}
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
              <Stars value={Math.round(avgRating)} />
              <span>
                {reviews.length
                  ? `${avgRating.toFixed(1)} (${reviews.length} review${reviews.length > 1 ? "s" : ""})`
                  : "No reviews yet"}
              </span>
            </div>

            {/* price block */}
            <div className="mt-5 flex items-end gap-4">
              <div className="text-3xl font-extrabold text-red-600">₹ {price}</div>
              <div className="pb-1 text-xs text-gray-500">Inclusive of all taxes</div>
            </div>

            {/* stock status */}
            <div className="mt-3">
              {isOutOfStock ? (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-700 text-sm font-medium ring-1 ring-red-200">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  Out of stock
                </span>
              ) : isLowStock ? (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-sm font-medium ring-1 ring-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Only {stock} left, order soon
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-sm font-medium ring-1 ring-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  In stock ({stock} available)
                </span>
              )}
            </div>

            {/* short description */}
            <p className="text-gray-600 mt-5 text-sm leading-relaxed">
              {product?.shortDescription ||
                (product?.description
                  ? `${product.description.slice(0, 250)}${product.description.length > 250 ? "..." : ""}`
                  : "")}
            </p>

            {/* expandable full description */}
            {product?.description && (
              <details className="mt-4 group rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                <summary className="cursor-pointer font-medium text-gray-900">
                  Product details
                </summary>
                <div className="mt-2 leading-relaxed whitespace-pre-line">{product.description}</div>
              </details>
            )}

            {/* brand and sku */}
            <div className="mt-4 flex gap-6 text-sm text-gray-500">
              <div>
                Brand: <span className="font-medium text-gray-800">{brand}</span>
              </div>
              <div>
                SKU: <span className="font-medium text-gray-800">{product?.sku || "—"}</span>
              </div>
            </div>

            {/* quantity picker */}
            {!isOutOfStock && (
              <div className="mt-6 flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Quantity</span>
                <div className="inline-flex items-center rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => changeQty(-1)}
                    disabled={qty <= 1}
                    className="w-10 h-10 text-lg hover:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="w-10 text-center font-semibold">{qty}</span>
                  <button
                    type="button"
                    onClick={() => changeQty(1)}
                    disabled={qty >= stock}
                    className="w-10 h-10 text-lg hover:bg-gray-50 disabled:text-gray-300 disabled:cursor-not-allowed"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* action buttons */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleBuy}
                disabled={isOutOfStock}
                className={`w-full sm:flex-1 px-6 py-3.5 rounded-xl text-base font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
                  isOutOfStock
                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                    : "bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-200"
                }`}
              >
                {isOutOfStock ? "Out of stock" : "Buy now"}
              </button>

              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`w-full sm:flex-1 px-6 py-3.5 rounded-xl text-base font-semibold border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${
                  isOutOfStock
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-white text-gray-900 border-gray-300 hover:bg-gray-50"
                }`}
              >
                Add to cart
              </button>
            </div>

            {/* feature cards */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                <MdLocalShipping className="text-green-600 flex-shrink-0" size={22} />
                <div>
                  <div className="text-sm font-medium">Free delivery</div>
                  <div className="text-xs text-gray-500">On orders over ₹499</div>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                <ImUndo2 className="text-indigo-600 flex-shrink-0" size={18} />
                <div>
                  <div className="text-sm font-medium">3-day replacement</div>
                  <div className="text-xs text-gray-500">Hassle-free returns</div>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl">
                <FaMoneyBillWave className="text-yellow-600 flex-shrink-0" size={18} />
                <div>
                  <div className="text-sm font-medium">Cash on delivery</div>
                  <div className="text-xs text-gray-500">Available</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* reviews section */}
        <div className="mt-12 pt-8 border-t border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Customer reviews</h2>

          {/* review form */}
          <form onSubmit={submitReview} className="mt-4 p-4 rounded-2xl bg-gray-50 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Your rating</span>
              <Stars value={rating} onChange={setRating} size={22} />
            </div>

            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={3}
              placeholder="Share what you liked or didn't like"
              className="w-full rounded-xl border border-gray-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
            />

            <div className="flex flex-wrap items-center gap-3">
              <label className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-sm cursor-pointer hover:bg-gray-50">
                Add photo
                <input type="file" accept="image/*" onChange={onSelectReviewImage} className="hidden" />
              </label>
              {previewReviewUrl && (
                <img
                  src={previewReviewUrl}
                  alt="preview"
                  className="w-16 h-16 object-cover rounded-lg border"
                />
              )}
              <button
                type="submit"
                disabled={submittingReview}
                className="ml-auto px-5 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-black disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submittingReview ? "Submitting..." : "Post review"}
              </button>
            </div>
          </form>

          {/* reviews list */}
          <div className="mt-6 space-y-4">
            {reviews.length === 0 && (
              <p className="text-sm text-gray-500">No reviews yet. Be the first to review this product.</p>
            )}

            {reviews.map((r, idx) => (
              <div key={r._id || idx} className="p-4 border border-gray-100 rounded-2xl bg-white shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-red-100 text-red-700 rounded-full flex items-center justify-center text-sm font-semibold uppercase">
                    {getReviewerName(r)?.[0] || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-gray-900 truncate">{getReviewerName(r)}</div>
                      <div className="text-xs text-gray-500 flex-shrink-0">
                        {new Date(r.createdAt || Date.now()).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="mt-1">
                      <Stars value={r.rating || 5} size={14} />
                    </div>
                    <div className="text-sm text-gray-700 mt-2 break-words">{r.comment}</div>
                    {r.image && (
                      <img
                        src={r.image.startsWith("http") || r.image.startsWith("blob:") ? r.image : `${API}/${r.image}`}
                        alt="review"
                        className="mt-3 w-36 h-24 object-cover rounded-lg border"
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* sticky mobile bar so the buttons stay reachable */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3">
        <div className="flex-shrink-0">
          <div className="text-xs text-gray-500">Price</div>
          <div className="text-lg font-extrabold text-red-600">₹ {price}</div>
        </div>
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold border ${
            isOutOfStock
              ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
              : "bg-white text-gray-900 border-gray-300"
          }`}
        >
          Add to cart
        </button>
        <button
          onClick={handleBuy}
          disabled={isOutOfStock}
          className={`flex-1 py-3 rounded-xl text-sm font-semibold ${
            isOutOfStock ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-red-600 text-white"
          }`}
        >
          {isOutOfStock ? "Out of stock" : "Buy now"}
        </button>
      </div>
    </div>
  );
}