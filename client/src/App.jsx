import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import NavBar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import Chatbot from "./components/Chatbot";

// Public pages
import HomePage from "./page/HomePage.jsx";
import Login from "./page/Login.jsx";
import Register from "./page/Register.jsx";
import ProductDetails from "./page/ProductDetails.jsx";
import CategoryProducts from "./page/CategoryDetails.jsx";
import SearchResults from "./page/SearchResults.jsx";
import CartPage from "./page/CartPage.jsx";
import CheckOut from "./page/CheckOut.jsx";
import TrackOrder from "./page/TrackOrder.jsx";
import Contact from "./page/Contact.jsx";
import About from "./page/About.jsx";

// Admin pages (content only — the sidebar/menu live in AdminLayout)
import AdminLayout from "./page/admin/Adminlayout.jsx";
import AdminDashBoard from "./page/admin/AdminDashBoard.jsx";
import CreatePost from "./page/admin/CreatePost.jsx";
import CreateCategory from "./page/admin/CreateCategory.jsx";
import AllReturnOrders from "./page/admin/AllReturnOrder.jsx";
import Activation from "./page/admin/Activation.jsx";
import AdminOrders from "./page/admin/AllOrder.jsx";
import AdminPaymentDetails from "./page/admin/Adminpaymentdetails.jsx";

// User pages (content only — the sidebar/menu live in UserLayout)
import UserLayout from "./page/user/Userlayout.jsx";
import UserDashBoard from "./page/user/UserDashBoard.jsx";
import UserOrders from "./page/user/UserOrders.jsx";

// Route guards
import PrivateRoutes from "./components/routes/Private.jsx";
import AdminRoutes from "./components/routes/Admin.jsx";

const NotFound = () => (
  <main className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-center p-6">
    <h1 className="text-2xl font-bold text-gray-800">Page not found</h1>
    <p className="text-gray-500">The page you're looking for doesn't exist.</p>
    <Link to="/" className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700">
      Back to home
    </Link>
  </main>
);

function App() {
  return (
    <>
      <NavBar />
      <Chatbot />
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/product/:slug" element={<ProductDetails />} />
        <Route path="/category/:catId" element={<CategoryProducts />} />
        <Route path="/search" element={<SearchResults />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckOut />} />
        <Route path="/track/:id" element={<TrackOrder />} />

        {/* User: guard -> layout (sidebar stays) -> page */}
        <Route path="/user" element={<PrivateRoutes />}>
          <Route element={<UserLayout />}>
            <Route index element={<UserDashBoard />} />
            <Route path="orders" element={<UserOrders />} />
          </Route>
        </Route>

        {/* Admin: guard -> layout (sidebar stays) -> page */}
        <Route path="/admin" element={<AdminRoutes />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminDashBoard />} />
            <Route path="details" element={<AdminDashBoard />} />
            <Route path="item" element={<CreatePost />} />
            <Route path="create-category" element={<CreateCategory />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="return-orders" element={<AllReturnOrders />} />
            <Route path="payments" element={<AdminPaymentDetails />} />
            <Route path="activation" element={<Activation />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </>
  );
}

export default App;