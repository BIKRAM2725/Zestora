// src/page/admin/AllReturnOrder.jsx
import React, { useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import useCachedData, { invalidateCache } from "../../hooks/useCachedData";
import { getAuthHeaders } from "../../utils/authHeaders";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const sortNewestFirst = (arr) =>
  (arr || []).slice().sort((a, b) => {
    const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bd - ad;
  });

export default function AllReturnOrders() {
  const [processingIds, setProcessingIds] = useState(new Set());
  const scrollRef = useRef(null);

  const { data, loading, refreshing, error, mutate, refetch } = useCachedData(
    "admin:returns",
    async () => {
      const res = await axios.get(`${API}/api/orders/return-orders`, { headers: getAuthHeaders() });
      if (!res.data?.success) throw new Error(res.data?.message || "Failed to load return orders");
      return sortNewestFirst(res.data.returnOrders);
    },
    { ttl: 15000 }
  );

  const returnOrders = data || [];
  const newestId = returnOrders.length ? returnOrders[0]._id : null;

  // action: "Approved" | "Rejected" | "Collected"
  const runAction = async (orderId, action) => {
    setProcessingIds((prev) => new Set(prev).add(orderId));
    const snapshot = returnOrders;

    // optimistic update
    mutate((prev) =>
      (prev || []).map((o) =>
        o._id === orderId
          ? {
              ...o,
              returnRefund: { ...(o.returnRefund || {}), status: action },
              status: action === "Approved" ? "Pending Pickup" : action === "Collected" ? "Collected" : o.status,
            }
          : o
      )
    );

    try {
      const { data: res } = await axios.put(
        `${API}/api/orders/return/${orderId}`,
        { action },
        { headers: getAuthHeaders() }
      );

      if (res?.success) {
        const label = { Approved: "Refund approved", Rejected: "Refund rejected", Collected: "Pickup confirmed" }[action];
        toast.success(label);
        if (res.order) mutate((prev) => (prev || []).map((o) => (o._id === orderId ? res.order : o)));
        invalidateCache("admin:orders");
      } else {
        toast.error(res?.message || "Failed to update refund status");
        mutate(snapshot); // rollback
      }
    } catch (err) {
      console.error("runAction error:", err?.response?.data || err.message);
      toast.error(err?.response?.data?.message || "Error updating refund status");
      mutate(snapshot); // rollback
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
      <h2 className="text-2xl font-bold text-center mb-4 hidden md:block">
        Return / Refund Requests
        {refreshing && <span className="ml-3 text-xs font-normal text-gray-400">Updating…</span>}
      </h2>

      {loading && <p className="text-center text-gray-500 py-10">Loading return/refund requests...</p>}

      {!loading && error && returnOrders.length === 0 && (
        <div className="text-center py-10">
          <p className="text-gray-600 mb-3">Couldn't load return requests.</p>
          <button onClick={refetch} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
            Try again
          </button>
        </div>
      )}

      {!loading && !error && returnOrders.length === 0 && (
        <p className="text-center text-gray-500 py-10">No return/refund requests.</p>
      )}

      {returnOrders.length > 0 && (
        <div ref={scrollRef} className="mt-4 max-h-[70vh] sm:max-h-[65vh] overflow-y-auto pr-3 space-y-6">
          {returnOrders.map((order) => {
            const rr = order.returnRefund || {};
            const busy = processingIds.has(order._id);

            return (
              <article
                key={order._id}
                className="border p-4 rounded-lg shadow-sm flex flex-col gap-3 relative bg-white"
              >
                {order._id === newestId && (
                  <span className="absolute top-3 left-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-600 text-white z-10">
                    NEW
                  </span>
                )}

                <div className="flex items-start gap-4">
                  <div className="flex-1 pt-5 sm:pt-0">
                    <p className="text-sm text-gray-600">
                      <strong>Order ID:</strong> {order._id}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>User:</strong> {order.user?.name} ({order.user?.email})
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Type:</strong> {rr.requestType || "Refund"} &nbsp;|&nbsp; <strong>Amount:</strong> ₹
                      {order.total}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Refund to UPI:</strong>{" "}
                      <span className="font-mono">{rr.upi || "—"}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Reason:</strong> {rr.reason || "—"}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Request Status:</strong>{" "}
                      <span className="inline-block px-2 py-0.5 rounded-lg text-xs font-medium bg-gray-100">
                        {rr.status || "Requested"}
                      </span>
                    </p>
                  </div>

                  <div className="text-right">
                    {rr.status === "Approved" && (
                      <div className="text-sm font-semibold text-indigo-700 bg-indigo-50 px-2 py-1 rounded">
                        Approved — Awaiting Pickup
                      </div>
                    )}
                    {rr.status === "Rejected" && (
                      <div className="text-sm font-semibold text-red-700 bg-red-50 px-2 py-1 rounded">Rejected</div>
                    )}
                    {rr.status === "Collected" && (
                      <div className="text-sm font-semibold text-green-700 bg-green-50 px-2 py-1 rounded">
                        Collected
                      </div>
                    )}
                  </div>
                </div>

                {/* items with thumbnails */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Array.isArray(order.items) && order.items.length ? (
                    order.items.map((i, idx) => {
                      const product = i.product || {};
                      const img =
                        (product.images && product.images[0]) ||
                        product.image ||
                        product.thumbnail ||
                        "/placeholder.jpg";
                      return (
                        <div
                          key={`${order._id}-${product._id || idx}`}
                          className="flex items-center gap-3 border rounded p-2 bg-gray-50"
                        >
                          <img
                            src={img}
                            alt={product.title || product.name || "product"}
                            className="w-16 h-16 rounded object-cover border"
                          />
                          <div>
                            <div className="font-medium">{product.title || product.name || "Product"}</div>
                            <div className="text-sm text-gray-600">Qty: {i.quantity}</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-gray-500">No items listed.</div>
                  )}
                </div>

                {/* actions */}
                <div className="flex gap-2 mt-2">
                  {rr.status === "Requested" && (
                    <>
                      <button
                        onClick={() => runAction(order._id, "Approved")}
                        className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                        disabled={busy}
                      >
                        {busy ? "Processing..." : "Approve"}
                      </button>
                      <button
                        onClick={() => runAction(order._id, "Rejected")}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                        disabled={busy}
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {rr.status === "Approved" && (
                    <button
                      onClick={() => runAction(order._id, "Collected")}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      disabled={busy}
                    >
                      {busy ? "Processing..." : "Confirm Pickup"}
                    </button>
                  )}

                  {rr.status !== "Requested" && rr.status !== "Approved" && (
                    <div className="text-sm text-gray-600 italic">No further actions for this request.</div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}