// src/page/admin/AdminDashBoard.jsx
import React from "react";
import AdminDetails from "./AdminDetails";

// Sidebar / mobile menu now come from AdminLayout.
const AdminDashBoard = () => (
  <div className="max-w-4xl mx-auto">
    <AdminDetails />
  </div>
);

export default AdminDashBoard;