// src/page/user/UserOrders.jsx
import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth } from "../../context/UserContext";
import useCachedData from "../../hooks/useCachedData";
import { getAuthHeaders } from "../../utils/authHeaders";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const sortNewestFirst = (arr) =>
  [...(arr || [])].sort(
    (a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0)
  );

export default function UserOrders() {
  const [auth] = useAuth();
  const uid = auth?.user?._id || auth?.user?.id;

  const [returnData, setReturnData] = useState({});
  const [disabledOrders, setDisabledOrders] = useState({});

  const { data, loading, refreshing, error, mutate, refetch } = useCachedData(
    uid ? `user:orders:${uid}` : null,
    async () => {
      const res = await axios.get(`${API}/api/orders/user/${uid}`, { headers: getAuthHeaders() });
      if (!res.data?.success) throw new Error(res.data?.message || "Failed to fetch orders");
      return sortNewestFirst(res.data.orders);
    },
    { ttl: 15000, enabled: !!uid }
  );
  const orders = data || [];

  const setFlag = (orderId, patch) =>
    setDisabledOrders((prev) => ({ ...prev, [orderId]: { ...(prev[orderId] || {}), ...patch } }));

  const handleCancel = async (orderId) => {
    try {
      setFlag(orderId, { cancelInFlight: true });
      const res = await axios.put(`${API}/api/orders/cancel/${orderId}`, {}, { headers: getAuthHeaders() });
      if (res.data.success) {
        toast.success("Order cancelled successfully");
        setFlag(orderId, { cancel: true, cancelInFlight: false });
        mutate((prev) => (prev || []).map((o) => (o._id === orderId ? { ...o, status: "Cancelled" } : o)));
      }
    } catch (err) {
      console.error("handleCancel:", err?.response?.data || err.message);
      toast.error(err?.response?.data?.message || "Failed to cancel order");
      setFlag(orderId, { cancelInFlight: false });
    }
  };

  const handleReturnSubmit = async (orderId) => {
    const d = returnData[orderId] || {};
    const type = (d.type || "").trim();
    const reason = (d.reason || "").trim();
    const upi = (d.upi || "").trim();

    if (!type || !reason || (type === "Refund" && !upi)) {
      toast.warning("Please fill all required fields");
      return;
    }

    const headers = getAuthHeaders();
    if (!headers.Authorization) {
      toast.error("You are not logged in. Please log in to request a return.");
      return;
    }

    setFlag(orderId, { returnInFlight: true });
    try {
      const res = await axios.post(`${API}/api/orders/return/${orderId}`, { type, reason, upi }, { headers });

      if (res.data.success) {
        toast.success(`${type} request submitted`);
        setFlag(orderId, { return: true, returnInFlight: false });

        const updatedOrder = res.data.order || null;
        mutate((prev) =>
          (prev || []).map((o) =>
            o._id === orderId
              ? updatedOrder || {
                  ...o,
                  returnRefund: {
                    ...(o.returnRefund || {}),
                    status: "Requested",
                    requestType: type,
                    reason,
                    upi,
                    requestDate: new Date().toISOString(),
                  },
                }
              : o
          )
        );
        setReturnData((prev) => ({ ...prev, [orderId]: {} }));
      } else {
        toast.error(res.data.message || "Failed to submit return/refund request");
        setFlag(orderId, { returnInFlight: false });
      }
    } catch (err) {
      console.error("handleReturnSubmit:", err?.response?.data || err.message);
      toast.error(err?.response?.data?.message || "Failed to submit return/refund request");
      setFlag(orderId, { returnInFlight: false });
    }
  };

  const isReturnEligible = (order) => {
    if (!order || order.status !== "Delivered") return false;
    const diff = (new Date() - new Date(order.updatedAt || order.createdAt || 0)) / (1000 * 60 * 60 * 24);
    return diff <= 3; // 3-day return window
  };

  return (
    <div>
      <h2 className="hidden md:block text-3xl font-bold text-center mb-6">
        My Orders
        {refreshing && <span className="ml-3 text-xs font-normal text-gray-400">Updating…</span>}
      </h2>

      {!uid && <p className="text-center text-gray-500 mt-10 md:mt-0">Please sign in to see your orders.</p>}

      {uid && loading && <p className="text-center text-gray-500 mt-10 md:mt-0">Loading orders...</p>}

      {uid && !loading && error && orders.length === 0 && (
        <div className="text-center mt-10 md:mt-0">
          <p className="text-gray-600 mb-3">Couldn't load your orders.</p>
          <button onClick={refetch} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
            Try again
          </button>
        </div>
      )}

      {uid && !loading && !error && orders.length === 0 && (
        <p className="text-center text-gray-500 mt-10 md:mt-0">No orders yet.</p>
      )}

      <div className="space-y-6 pt-4 md:pt-0">
        {orders.map((order) => {
          const oid = order._id || order.id;
          const hasReturnRequested =
            order.returnRefund && order.returnRefund.status && order.returnRefund.status !== "Not Requested";
          const returnDisabled = disabledOrders[oid]?.return || hasReturnRequested;
          const cancelBusy = disabledOrders[oid]?.cancel || disabledOrders[oid]?.cancelInFlight;

          return (
            <div key={oid} className="bg-white p-5 rounded-xl shadow-lg border border-gray-200">
              {/* Order Header */}
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold text-lg">Order #{String(oid).slice(-6)}</h3>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.status === "Pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : order.status === "Delivered"
                      ? "bg-green-100 text-green-700"
                      : order.status === "Cancelled"
                      ? "bg-red-100 text-red-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {order.status}
                </span>
              </div>

              <p className="text-sm text-gray-500 mb-3">Placed on: {new Date(order.createdAt).toLocaleString()}</p>

              {/* Items */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-3">
                {(order.items || []).map((item, idx) => {
                  const product = item.product || {};
                  const image = product?.images?.[0] || product?.image || product?.thumbnail || "/placeholder.jpg";
                  return (
                    <div
                      key={`${product?._id || "item"}-${idx}`}
                      className="flex items-center justify-between text-gray-700"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={image}
                          alt={product?.title || "product"}
                          loading="lazy"
                          className="w-12 h-12 rounded object-cover border"
                        />
                        <div className="text-sm">
                          <p className="font-medium">{product?.title || "Product"}</p>
                          <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <span className="font-medium text-sm">₹{item.priceAtPurchase}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between font-semibold mb-1">
                <span>Total:</span>
                <span>₹{order.total}</span>
              </div>
              <p className="text-sm text-gray-600 mb-4">Payment Method: {order.paymentMethod}</p>

              <div className="flex flex-col gap-3">
                {["Pending", "Accepted"].includes(order.status) && (
                  <button
                    onClick={() => handleCancel(oid)}
                    disabled={cancelBusy}
                    className={`px-3 py-2 rounded text-white font-medium transition duration-150 ${
                      cancelBusy ? "bg-gray-400 cursor-not-allowed" : "bg-red-500 hover:bg-red-600"
                    }`}
                  >
                    {disabledOrders[oid]?.cancelInFlight
                      ? "Cancelling..."
                      : disabledOrders[oid]?.cancel
                      ? "Cancelled"
                      : "Cancel Order"}
                  </button>
                )}

                {/* Return form */}
                {isReturnEligible(order) && !returnDisabled && (
                  <div className="flex flex-col gap-2 p-3 border border-gray-300 rounded-lg bg-yellow-50">
                    <select
                      value={returnData[oid]?.type || ""}
                      onChange={(e) =>
                        setReturnData((prev) => ({ ...prev, [oid]: { ...prev[oid], type: e.target.value } }))
                      }
                      className="border p-2 rounded text-sm"
                    >
                      <option value="">Select Type</option>
                      <option value="Refund">Refund</option>
                    </select>

                    <textarea
                      placeholder="Enter reason..."
                      value={returnData[oid]?.reason || ""}
                      onChange={(e) =>
                        setReturnData((prev) => ({ ...prev, [oid]: { ...prev[oid], reason: e.target.value } }))
                      }
                      className="border p-2 rounded text-sm resize-none"
                      rows="2"
                    />

                    {returnData[oid]?.type === "Refund" && (
                      <input
                        type="text"
                        placeholder="Enter UPI ID (Required for Refund)"
                        value={returnData[oid]?.upi || ""}
                        onChange={(e) =>
                          setReturnData((prev) => ({ ...prev, [oid]: { ...prev[oid], upi: e.target.value } }))
                        }
                        className="border p-2 rounded text-sm"
                      />
                    )}

                    <button
                      onClick={() => handleReturnSubmit(oid)}
                      disabled={disabledOrders[oid]?.returnInFlight}
                      className={`px-3 py-2 rounded text-white font-medium transition duration-150 ${
                        disabledOrders[oid]?.returnInFlight
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-yellow-500 hover:bg-yellow-600"
                      }`}
                    >
                      {disabledOrders[oid]?.returnInFlight ? "Requesting..." : "Submit Return/Refund Request"}
                    </button>
                  </div>
                )}

                {/* Return status */}
                {isReturnEligible(order) && returnDisabled && (
                  <div className="p-3 border rounded-lg bg-yellow-100 border-yellow-300">
                    <div className="text-sm font-semibold text-yellow-800">
                      Return/Refund Request Status: {order.returnRefund?.status || "Requested"}
                    </div>
                    <div className="text-xs text-yellow-700 mt-1">Type: {order.returnRefund?.requestType || "Refund"}</div>
                    <div className="text-xs mt-1 text-gray-700">Reason: {order.returnRefund?.reason}</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}