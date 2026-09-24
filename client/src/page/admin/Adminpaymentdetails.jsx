// src/page/admin/Adminpaymentdetails.jsx
import React, { useState } from "react";
import axios from "axios";
import useCachedData from "../../hooks/useCachedData";
import { getAuthHeaders } from "../../utils/authHeaders";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

export default function AdminPaymentDetails() {
  const [statusFilter, setStatusFilter] = useState("All");

  const { data, loading, refreshing, error, refetch } = useCachedData(
    `admin:payments:${statusFilter}`,
    async () => {
      const params = statusFilter !== "All" ? { status: statusFilter } : {};
      const res = await axios.get(`${API}/api/orders/admin/payment-details`, {
        headers: getAuthHeaders(),
        params,
      });
      if (!res.data?.success) throw new Error(res.data?.message || "Failed to load payment details");
      return res.data.payments || [];
    },
    { ttl: 15000 }
  );

  const payments = data || [];

  const totals = payments.reduce(
    (acc, p) => {
      acc.total += p.total || 0;
      if (p.verificationStatus === "Verified") acc.verifiedCount += 1;
      else acc.pendingCount += 1;
      return acc;
    },
    { total: 0, verifiedCount: 0, pendingCount: 0 }
  );

  return (
    <div className="bg-white shadow-xl rounded-2xl p-4 sm:p-6 max-w-6xl mx-auto border border-gray-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h2 className="text-2xl font-bold hidden md:block">
          Payment Details
          {refreshing && <span className="ml-3 text-xs font-normal text-gray-400">Updating…</span>}
        </h2>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border p-2 rounded text-sm w-full sm:w-auto"
          aria-label="Filter payments by verification status"
        >
          <option value="All">All statuses</option>
          <option value="Pending">Pending</option>
          <option value="Verified">Verified</option>
        </select>
      </div>

      {/* Summary strip */}
      {!loading && payments.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="bg-gray-50 rounded-lg p-3 border">
            <div className="text-xs text-gray-500">Total (filtered)</div>
            <div className="text-lg font-semibold">₹{totals.total}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="text-xs text-green-700">Verified</div>
            <div className="text-lg font-semibold text-green-700">{totals.verifiedCount}</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
            <div className="text-xs text-yellow-700">Pending</div>
            <div className="text-lg font-semibold text-yellow-700">{totals.pendingCount}</div>
          </div>
        </div>
      )}

      {loading && <p className="text-center text-gray-500 py-10">Loading payment details...</p>}

      {!loading && error && payments.length === 0 && (
        <div className="text-center py-10">
          <p className="text-gray-600 mb-3">Couldn't load payment details.</p>
          <button onClick={refetch} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
            Try again
          </button>
        </div>
      )}

      {!loading && !error && payments.length === 0 && (
        <p className="text-center text-gray-500 py-10">No payments found.</p>
      )}

      {payments.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left border-b bg-gray-50">
                <th className="p-3">Order</th>
                <th className="p-3">Customer</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3">Method</th>
                <th className="p-3">Verification</th>
                <th className="p-3">Verified At</th>
                <th className="p-3">Placed</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.orderId} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-mono text-xs">{String(p.orderId).slice(-6)}</td>
                  <td className="p-3">
                    <div>{p.user?.name || "—"}</div>
                    <div className="text-xs text-gray-500">{p.user?.email || ""}</div>
                  </td>
                  <td className="p-3 text-right">₹{p.total}</td>
                  <td className="p-3">{p.paymentMethod}</td>
                  <td className="p-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        p.verificationStatus === "Verified"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {p.verificationStatus}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-gray-600">
                    {p.verifiedAt ? new Date(p.verifiedAt).toLocaleString() : "—"}
                  </td>
                  <td className="p-3 text-xs text-gray-600">
                    {p.createdAt ? new Date(p.createdAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}