// src/page/admin/AllOrder.jsx
import React, { useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import OrderCard from "../../components/Order/OrderCard";
import useCachedData, { invalidateCache } from "../../hooks/useCachedData";
import { getAuthHeaders } from "../../utils/authHeaders";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const STATUS_OPTIONS = [
  "All",
  "Pending",
  "Accepted",
  "Confirmed",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
  "Pending Pickup",
  "Collected",
];

const sortNewestFirst = (arr) =>
  (arr || []).slice().sort((a, b) => {
    const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bd - ad;
  });

export default function AllOrder() {
  const [filter, setFilter] = useState("All");
  const [processingIds, setProcessingIds] = useState(new Set());
  const scrollRef = useRef(null);

  // One cache entry per filter: switching back to a filter you already opened is instant.
  const {
    data,
    loading,
    refreshing,
    error,
    mutate,
    refetch,
  } = useCachedData(
    `admin:orders:${filter}`,
    async () => {
      const url =
        filter === "All"
          ? `${API}/api/orders`
          : `${API}/api/orders?status=${encodeURIComponent(filter)}`;
      const res = await axios.get(url, { headers: getAuthHeaders() });
      if (!res.data?.success) throw new Error(res.data?.message || "Failed to fetch orders");
      return sortNewestFirst(res.data.orders);
    },
    { ttl: 15000 }
  );

  const orders = data || [];
  const newestOrderId = orders.length ? orders[0]._id : null;

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const { data: res } = await axios.put(
        `${API}/api/orders/status/${orderId}`,
        { status: newStatus },
        { headers: getAuthHeaders() }
      );
      if (res?.success) {
        toast.success(`Order marked as ${newStatus}`);
        mutate((prev) => (prev || []).map((o) => (o._id === orderId ? { ...o, status: newStatus } : o)));
        invalidateCache("admin:orders"); // other filters are now out of date
        invalidateCache("admin:payments");
      } else {
        toast.error(res?.message || "Failed to update status");
      }
    } catch (err) {
      console.error("Error updating status:", err?.response?.data || err.message);
      toast.error(err?.response?.data?.message || "Error updating status");
    }
  };

  const handleConfirmPickup = async (orderId) => {
    setProcessingIds((prev) => new Set(prev).add(orderId));
    const snapshot = orders;

    // optimistic update
    mutate((prev) =>
      (prev || []).map((o) =>
        o._id === orderId
          ? { ...o, status: "Collected", returnRefund: { ...(o.returnRefund || {}), status: "Collected" } }
          : o
      )
    );

    try {
      const { data: res } = await axios.put(
        `${API}/api/orders/return/${orderId}`,
        { action: "Collected" },
        { headers: getAuthHeaders() }
      );
      if (res?.success) {
        toast.success("Pickup confirmed (collected)");
        if (res.order) mutate((prev) => (prev || []).map((o) => (o._id === orderId ? res.order : o)));
        invalidateCache("admin:orders");
        invalidateCache("admin:returns");
      } else {
        toast.error(res?.message || "Failed to confirm pickup");
        mutate(snapshot);
      }
    } catch (err) {
      console.error("Error confirming pickup:", err?.response?.data || err.message);
      toast.error(err?.response?.data?.message || "Error confirming pickup");
      mutate(snapshot);
    } finally {
      setProcessingIds((prev) => {
        const s = new Set(prev);
        s.delete(orderId);
        return s;
      });
    }
  };

  return (
    <div className="bg-white shadow-xl rounded-2xl p-4 sm:p-6 max-w-6xl mx-auto border border-gray-200">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h2 className="text-2xl font-bold text-gray-800">
          Purchase Orders
          {refreshing && <span className="ml-3 text-xs font-normal text-gray-400">Updating…</span>}
        </h2>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-300 rounded-lg p-2 text-sm"
          aria-label="Filter orders by status"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="text-center text-gray-500 py-10">Loading orders...</p>}

      {!loading && error && orders.length === 0 && (
        <div className="text-center py-10">
          <p className="text-gray-600 mb-3">Couldn't load orders.</p>
          <button onClick={refetch} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
            Try again
          </button>
        </div>
      )}

      {!loading && !error && orders.length === 0 && <p className="text-center text-gray-500 py-10">No orders found.</p>}

      {orders.length > 0 && (
        <div ref={scrollRef} className="mt-4 max-h-[70vh] sm:max-h-[65vh] overflow-y-auto pr-3 space-y-6">
          {orders.map((order, i) => (
            <div key={order._id || i} className="relative bg-white p-3 rounded-lg shadow-sm">
              {order._id === newestOrderId && filter === "All" && (
                <span className="absolute top-3 left-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-600 text-white z-10">
                  NEW
                </span>
              )}

              <OrderCard order={order} index={i} onStatusUpdate={handleStatusUpdate} />

              {order.status === "Pending Pickup" && (
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => handleConfirmPickup(order._id)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    disabled={processingIds.has(order._id)}
                  >
                    {processingIds.has(order._id) ? "Processing..." : "Confirm Pickup"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}