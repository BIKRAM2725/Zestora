// src/page/user/UserDashBoard.jsx
import React from "react";
import UserDetails from "./UserDetails";

// Sidebar / mobile menu now come from UserLayout.
const UserDashBoard = () => (
  <div className="max-w-4xl mx-auto">
    <UserDetails />
  </div>
);

export default UserDashBoard;