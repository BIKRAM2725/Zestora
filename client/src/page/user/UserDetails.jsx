// src/page/user/UserDetails.jsx
import React from "react";
import { useAuth } from "../../context/UserContext";
import useLogout from "../../hooks/useLogout";
import { FaUserCircle, FaSignOutAlt } from "react-icons/fa";

const UserDetails = () => {
  const [auth] = useAuth();
  const logout = useLogout();
  const user = auth?.user;

  if (!user) {
    return (
      <div className="flex justify-center items-center h-full">
        <h2 className="text-lg font-semibold text-gray-500">No user logged in</h2>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-xl rounded-2xl p-8 max-w-lg mx-auto mt-4 md:mt-10 border border-gray-200">
      <div className="flex flex-col items-center mb-6">
        <FaUserCircle className="text-6xl text-indigo-500 mb-3" />
        <h2 className="text-2xl font-bold text-gray-800">{user.name}</h2>
        <p className="text-gray-500 text-sm">{user.email}</p>
      </div>

      <div className="border-t border-gray-200 mt-4 pt-4 space-y-3">
        <div className="flex justify-between text-gray-700">
          <span className="font-semibold">Role:</span>
          <span className="capitalize">{user.role}</span>
        </div>
        <div className="flex justify-between text-gray-700">
          <span className="font-semibold">User ID:</span>
          <span className="text-sm text-gray-500 break-all text-right ml-4">{user.id || user._id}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={logout}
        className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 transition"
      >
        <FaSignOutAlt />
        Logout
      </button>
    </div>
  );
};

export default UserDetails;