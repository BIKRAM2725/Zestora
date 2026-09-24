// src/pages/CheckoutPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useCart } from "../context/CartContext";
import { toast } from "react-toastify";
import { useNavigate, useLocation, Link } from "react-router-dom";

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// address form fields with labels and required flags
const ADDRESS_FIELDS = [
  { name: "firstName", label: "First name", required: true },
  { name: "lastName", label: "Last name", required: true },
  { name: "mobileNo", label: "Mobile number", required: true, full: true },
  { name: "flatNo", label: "Flat / house no.", required: true },
  { name: "localAddress", label: "Street / area", required: true },
  { name: "landmark", label: "Landmark", required: false, full: true },
  { name: "district", label: "District", required: true },
  { name: "city", label: "City", required: true },
  { name: "state", label: "State", required: true },
  { name: "pincode", label: "Pincode", required: true },
];

const EMPTY_ADDRESS = {
  firstName: "",
  lastName: "",
  mobileNo: "",
  flatNo: "",
  localAddress: "",
  landmark: "",
  district: "",
  city: "",
  state: "",
  pincode: "",
};

// promo rules: percent off, and whether it is limited to a first order
const PROMOS = {
  WELCOMEZESTORA: {
    percent: 25,
    firstOrderOnly: true,
    title: "25% off your first order",
    note: "New customers only, one time use",
  },
  SARODIYA2026: {
    percent: 5,
    firstOrderOnly: false,
    title: "5% off every order",
    note: "Works for everyone, every time",
  },
};

// endpoint that lists one user's orders by id, adjust to match your api
const getOrdersPath = (userId) => `/api/orders/user/${userId}`;

const CheckoutPage = () => {
  const { cart, clearCart } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // buy now passes a single item through router state
  const buyNowItem = location.state?.buyNow || null;

  const [userId, setUserId] = useState(null);
  const [authToken, setAuthToken] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [addressForm, setAddressForm] = useState(EMPTY_ADDRESS);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
  const [editingIndex, setEditingIndex] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");
  // null while unknown, otherwise how many orders this user has placed
  const [orderCount, setOrderCount] = useState(null);
  // idle, loading, ready or error
  const [orderStatus, setOrderStatus] = useState("idle");
  const [loading, setLoading] = useState(false);

  const RAZORPAY_KEY = process.env.REACT_APP_RAZORPAY_KEY || "rzp_test_RfXtOK78ACS6AR";
  const API_URL = process.env.REACT_APP_API_URL || "https://hotcolours-final.onrender.com";

  // buy now shows only its own item, otherwise the whole cart
  const checkoutItems = useMemo(
    () =>
      buyNowItem
        ? [{ product: buyNowItem.product, quantity: buyNowItem.quantity }]
        : cart?.items || [],
    [buyNowItem, cart]
  );

  const subtotal = checkoutItems.reduce(
    (acc, i) => acc + (i.product?.price || 0) * i.quantity,
    0
  );
  const activePromo = PROMOS[appliedPromo] || null;
  const discount = activePromo ? Math.round((subtotal * activePromo.percent) / 100) : 0;
  const deliveryCharge = subtotal - discount >= 200 ? 0 : 100;
  const finalAmount = Math.round(subtotal - discount + deliveryCharge);

  // read the signed in user from local storage
  useEffect(() => {
    const storedAuth = localStorage.getItem("auth");
    if (storedAuth) {
      try {
        const parsed = JSON.parse(storedAuth);
        setUserId(parsed?.user?.id || parsed?.user?._id || parsed?.user?.uid || null);
        setAuthToken(parsed?.token || parsed?.accessToken || parsed?.authToken || null);
      } catch (error) {
        console.error("Error parsing auth data:", error);
      }
    }
  }, []);

  // count this user's past orders to check first order promos
  useEffect(() => {
    if (!userId) {
      setOrderStatus("idle");
      return;
    }
    let cancelled = false;
    const loadOrderCount = async () => {
      setOrderStatus("loading");
      try {
        const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
        const res = await axios.get(`${API_URL}${getOrdersPath(userId)}`, { headers });
        const list = res.data?.orders ?? res.data;
        if (cancelled) return;
        if (Array.isArray(list)) {
          setOrderCount(list.length);
          setOrderStatus("ready");
        } else {
          setOrderCount(null);
          setOrderStatus("error");
        }
      } catch (err) {
        if (cancelled) return;
        setOrderCount(null);
        setOrderStatus("error");
      }
    };
    loadOrderCount();
    return () => {
      cancelled = true;
    };
  }, [userId, authToken, API_URL]);

  // first order offers are valid only when the user has exactly zero orders
  const isFirstOrder = orderStatus === "ready" && orderCount === 0;

  // drop a first order code if the user turns out not to be eligible
  useEffect(() => {
    if (PROMOS[appliedPromo]?.firstOrderOnly && !isFirstOrder) {
      setAppliedPromo("");
    }
  }, [appliedPromo, isFirstOrder]);

  // load saved addresses
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("addresses")) || [];
      setAddresses(saved);
    } catch {
      setAddresses([]);
    }
  }, []);

  const handleAddressChange = (e) =>
    setAddressForm({ ...addressForm, [e.target.name]: e.target.value });

  // validate and apply a typed code or a tapped suggestion
  const applyCode = (rawCode) => {
    const code = String(rawCode || "").trim().toUpperCase();
    const promo = PROMOS[code];
    if (!promo) {
      setAppliedPromo("");
      toast.error("Invalid promo code.");
      return;
    }
    if (promo.firstOrderOnly) {
      if (!userId) {
        toast.warn("Please sign in to use this code.");
        return;
      }
      if (orderStatus === "loading") {
        toast.info("Checking your eligibility, try again in a moment.");
        return;
      }
      if (orderStatus === "error") {
        toast.error("Could not verify your order history. Try again later.");
        return;
      }
      if (!isFirstOrder) {
        toast.error("Not eligible: this code is only valid on your first order.");
        return;
      }
    }
    setAppliedPromo(code);
    setPromoInput(code);
    toast.success(`Promo applied: ${promo.percent}% off`);
  };

  const removePromo = () => {
    setAppliedPromo("");
    setPromoInput("");
  };

  const openAddForm = () => {
    setAddressForm(EMPTY_ADDRESS);
    setEditingIndex(null);
    setShowAddressForm(true);
  };

  const openEditForm = (index) => {
    setAddressForm({ ...EMPTY_ADDRESS, ...addresses[index] });
    setEditingIndex(index);
    setShowAddressForm(true);
  };

  const handleSaveAddress = (e) => {
    e.preventDefault();
    const missing = ADDRESS_FIELDS.find((f) => f.required && !String(addressForm[f.name] || "").trim());
    if (missing) {
      toast.error(`${missing.label} is required.`);
      return;
    }
    if (!/^\d{10}$/.test(addressForm.mobileNo.trim())) {
      toast.error("Enter a 10 digit mobile number.");
      return;
    }
    if (!/^\d{6}$/.test(addressForm.pincode.trim())) {
      toast.error("Enter a 6 digit pincode.");
      return;
    }

    let updated;
    if (editingIndex !== null) {
      updated = [...addresses];
      updated[editingIndex] = addressForm;
      setSelectedAddressIndex(editingIndex);
    } else {
      updated = [...addresses, addressForm];
      setSelectedAddressIndex(updated.length - 1);
    }
    setAddresses(updated);
    localStorage.setItem("addresses", JSON.stringify(updated));
    setShowAddressForm(false);
  };

  const handleDeleteAddress = (index) => {
    const updated = addresses.filter((_, i) => i !== index);
    setAddresses(updated);
    localStorage.setItem("addresses", JSON.stringify(updated));
    setSelectedAddressIndex(0);
  };

  // api helpers
  const authHeaders = authToken ? { Authorization: `Bearer ${authToken}` } : {};

  const createRazorpayOrderOnServer = async (amountInPaise, metadata = {}) => {
    const res = await axios.post(
      `${API_URL}/api/payments/razorpay/create-order`,
      {
        amount: amountInPaise,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        metadata,
      },
      { headers: authHeaders }
    );
    return res.data;
  };

  const verifyRazorpayPaymentOnServer = async (verificationPayload) => {
    const res = await axios.post(
      `${API_URL}/api/payments/razorpay/verify`,
      verificationPayload,
      { headers: authHeaders }
    );
    return res.data;
  };

  // only clear the cart when the order came from the cart
  const finishOrder = () => {
    if (!buyNowItem) clearCart();
    navigate("/user/orders");
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!checkoutItems.length) {
      toast.info("Nothing to check out yet.");
      setLoading(false);
      navigate("/");
      return;
    }

    const address = addresses[selectedAddressIndex];
    if (!address) {
      toast.error("Please select or add a delivery address.");
      setLoading(false);
      return;
    }

    const orderMeta = {
      userId: userId || undefined,
      items: checkoutItems.map((item) => ({
        productId: item.product._id || item.product.id,
        quantity: item.quantity,
        priceAtPurchase: item.product.price,
      })),
      address,
      paymentMethod,
      promoCode: appliedPromo || null,
      discount,
      deliveryCharge,
      total: finalAmount,
    };

    try {
      if (paymentMethod === "Card") {
        // card flow through razorpay
        const ok = await loadRazorpayScript();
        if (!ok) {
          toast.error("Failed to load Razorpay SDK. Try again.");
          setLoading(false);
          return;
        }

        const createResp = await createRazorpayOrderOnServer(finalAmount * 100, {
          meta: orderMeta,
        });

        if (!createResp?.success || !createResp.razorpayOrder) {
          toast.error(createResp?.message || "Failed to create payment order. Try again.");
          setLoading(false);
          return;
        }

        const rOrder = createResp.razorpayOrder;

        const options = {
          key: RAZORPAY_KEY,
          amount: rOrder.amount,
          currency: rOrder.currency || "INR",
          name: process.env.REACT_APP_APP_NAME || "Zestora",
          description: "Order Payment",
          image: process.env.REACT_APP_APP_LOGO || "",
          order_id: rOrder.id,
          prefill: {
            name: `${address.firstName} ${address.lastName}`,
            email: JSON.parse(localStorage.getItem("auth") || "{}").user?.email || "",
            contact: address.mobileNo,
          },
          handler: async function (resp) {
            try {
              const verifyResp = await verifyRazorpayPaymentOnServer({
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_signature: resp.razorpay_signature,
                orderMeta,
              });

              if (verifyResp?.success) {
                toast.success("Payment successful and order placed");
                finishOrder();
              } else {
                toast.error(
                  verifyResp?.message || "Payment verification failed. Contact support."
                );
              }
            } catch (err) {
              console.error("verify handler error:", err?.response?.data || err.message);
              toast.error("Payment verification failed. Contact support.");
            } finally {
              setLoading(false);
            }
          },
          modal: {
            ondismiss: function () {
              toast.info("Payment cancelled");
              setLoading(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", function (resp) {
          console.error("Razorpay payment failed:", resp.error);
          toast.error(resp.error?.description || "Payment failed. Please try again.");
          setLoading(false);
        });
        rzp.open();
      } else {
        // cash on delivery flow
        const res = await axios.post(`${API_URL}/api/orders/create`, orderMeta, {
          headers: { ...authHeaders, "Content-Type": "application/json" },
        });

        if (res?.data?.success) {
          toast.success("Order placed successfully");
          finishOrder();
        } else {
          toast.error(res?.data?.message || "Failed to create order");
        }
        setLoading(false);
      }
    } catch (err) {
      console.error("Place order error:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Failed to place order. Try again.");
      setLoading(false);
    }
  };

  // empty state when neither the cart nor buy now has items
  if (!checkoutItems.length) {
    return (
      <div className="flex flex-col justify-center items-center h-[calc(100vh-80px)] gap-4 px-4 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Nothing to check out</h1>
        <Link
          to="/"
          className="px-6 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300";

  return (
    <div className="max-w-6xl mx-auto mt-8 px-4 sm:px-6 lg:px-8 pb-12">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Checkout</h1>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* left column: address, payment, promo */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* address section */}
          <section className="p-5 sm:p-6 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Delivery address</h2>
              <button
                type="button"
                onClick={openAddForm}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-black"
              >
                Add address
              </button>
            </div>

            {addresses.length > 0 ? (
              <div className="mt-4 space-y-3">
                {addresses.map((addr, idx) => (
                  <label
                    key={idx}
                    className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition ${
                      idx === selectedAddressIndex
                        ? "border-red-500 bg-red-50"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="selectedAddress"
                      checked={idx === selectedAddressIndex}
                      onChange={() => setSelectedAddressIndex(idx)}
                      className="mt-1 h-4 w-4 accent-red-600"
                    />
                    <div className="flex-1 text-sm text-gray-700">
                      <div className="font-semibold text-gray-900">
                        {addr.firstName} {addr.lastName} · {addr.mobileNo}
                      </div>
                      <div className="mt-1">
                        {addr.flatNo}, {addr.localAddress}
                        {addr.landmark ? `, ${addr.landmark}` : ""}, {addr.city}, {addr.state} -{" "}
                        {addr.pincode}
                      </div>
                      <div className="mt-2 flex gap-4 text-xs">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            openEditForm(idx);
                          }}
                          className="text-indigo-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            handleDeleteAddress(idx);
                          }}
                          className="text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">
                No address saved yet. Add one to continue.
              </p>
            )}
          </section>

          {/* payment section */}
          <section className="p-5 sm:p-6 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Payment method</h2>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { value: "COD", title: "Cash on delivery", note: "Pay when your order arrives" },
                { value: "Card", title: "Card / UPI / Netbanking", note: "Pay securely with Razorpay" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition ${
                    paymentMethod === opt.value
                      ? "border-red-500 bg-red-50"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={opt.value}
                    checked={paymentMethod === opt.value}
                    onChange={() => setPaymentMethod(opt.value)}
                    className="mt-1 h-4 w-4 accent-red-600"
                  />
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{opt.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{opt.note}</div>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* promo section */}
          <section className="p-5 sm:p-6 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Promo code</h2>

            {activePromo ? (
              <div className="mt-4 flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-50 ring-1 ring-emerald-200 text-sm text-emerald-800">
                <span>
                  <span className="font-semibold">{appliedPromo}</span> applied, you save ₹ {discount}
                </span>
                <button type="button" onClick={removePromo} className="text-emerald-900 underline">
                  Remove
                </button>
              </div>
            ) : (
              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  placeholder="Enter promo code"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value)}
                  className={`${inputClass} flex-1 uppercase`}
                />
                <button
                  type="button"
                  onClick={() => applyCode(promoInput)}
                  className="px-5 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-black"
                >
                  Apply
                </button>
              </div>
            )}

            {/* tappable offer suggestions */}
            <div className="mt-4 space-y-2">
              <div className="text-xs font-medium text-gray-500">Available offers</div>
              {Object.entries(PROMOS).map(([code, promo]) => {
                const blocked = promo.firstOrderOnly && !isFirstOrder;
                let blockedNote = "";
                if (blocked) {
                  if (!userId) blockedNote = "Sign in to use this offer";
                  else if (orderStatus === "loading") blockedNote = "Checking your eligibility...";
                  else if (orderStatus === "error") blockedNote = "Could not verify your order history";
                  else blockedNote = "Not eligible, you have already placed an order";
                }
                const isApplied = appliedPromo === code;
                return (
                  <div
                    key={code}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border border-dashed ${
                      blocked ? "border-gray-200 bg-gray-50 opacity-60" : "border-red-300 bg-red-50/50"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold tracking-wide text-gray-900">{code}</div>
                      <div className="text-xs text-gray-700">{promo.title}</div>
                      <div className="text-xs text-gray-500">
                        {blocked ? blockedNote : promo.note}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => applyCode(code)}
                      disabled={blocked || isApplied}
                      className="flex-shrink-0 px-4 py-1.5 rounded-lg text-sm font-semibold text-red-600 border border-red-300 hover:bg-red-50 disabled:text-gray-400 disabled:border-gray-200 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                    >
                      {isApplied ? "Applied" : "Apply"}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* right column: sticky summary */}
        <aside className="lg:sticky lg:top-24 h-fit p-5 sm:p-6 bg-white rounded-2xl shadow-sm ring-1 ring-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Order summary</h2>

          <div className="mt-4 space-y-3">
            {checkoutItems.map((item) => (
              <div key={item.product._id || item.product.id} className="flex items-center gap-3">
                <img
                  src={item.product.images?.[0] || "/placeholder.jpg"}
                  alt={item.product.title || item.product.name}
                  className="w-14 h-14 rounded-lg object-cover bg-gray-50 flex-shrink-0"
                />
                <div className="flex-1 min-w-0 text-sm">
                  <div className="font-medium text-gray-900 truncate">
                    {item.product.title || item.product.name}
                  </div>
                  <div className="text-gray-500">Qty {item.quantity}</div>
                </div>
                <div className="text-sm font-semibold text-gray-900">
                  ₹ {item.product.price * item.quantity}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100 space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>₹ {subtotal}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount ({appliedPromo})</span>
                <span>- ₹ {discount}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Delivery</span>
              <span>{deliveryCharge === 0 ? "Free" : `₹ ${deliveryCharge}`}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-lg font-extrabold text-gray-900">
            <span>Total</span>
            <span>₹ {finalAmount}</span>
          </div>

          <button
            onClick={handlePlaceOrder}
            disabled={loading}
            className="mt-6 w-full py-3.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 shadow-md shadow-red-200 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading
              ? "Processing..."
              : paymentMethod === "Card"
              ? `Pay ₹ ${finalAmount}`
              : "Place order"}
          </button>
        </aside>
      </div>

      {/* address modal */}
      {showAddressForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSaveAddress}
            className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg"
          >
            <h3 className="text-lg font-bold text-gray-900">
              {editingIndex !== null ? "Edit address" : "Add address"}
            </h3>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {ADDRESS_FIELDS.map((f) => (
                <div key={f.name} className={f.full ? "sm:col-span-2" : ""}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {f.label}
                    {f.required ? "" : " (optional)"}
                  </label>
                  <input
                    name={f.name}
                    value={addressForm[f.name] || ""}
                    onChange={handleAddressChange}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                type="button"
                onClick={() => setShowAddressForm(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-800 text-sm font-medium hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
              >
                Save address
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;