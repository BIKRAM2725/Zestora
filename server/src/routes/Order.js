// src/routes/orders.js
import express from "express";
import { requiredSignIn, isAdmin } from "../middlewares/Auth.js";
import {
  createOrder,
  getPublicOrder,
  sendPublicOtp,
  publicDeliver,
  resendOtp,
  verifyPayment,
  protectedDeliver,
  updateStatus,
  requestReturn,
  updateReturnStatus,
  generateDeliveryToken,
  getAllOrders,
  getReturnOrders,
  getUserOrders,
  cancelOrder,
  getOrderById,
  getPaymentDetails,
} from "../controller/Order.js";

const router = express.Router();

/* ---------------------- Routes ---------------------- */

router.post("/create", requiredSignIn, createOrder);

router.get("/public/:id", getPublicOrder);
router.post("/public/:id/send-otp", sendPublicOtp);
router.put("/public/:id/deliver", publicDeliver);

router.post("/resend-otp/:orderId", requiredSignIn, resendOtp);
router.post("/verify-payment/:orderId", requiredSignIn, verifyPayment);

router.put("/:orderId/deliver", requiredSignIn, protectedDeliver);

router.put("/status/:orderId", requiredSignIn, isAdmin, updateStatus);

router.post("/return/:orderId", requiredSignIn, requestReturn);
router.put("/return/:orderId", requiredSignIn, isAdmin, updateReturnStatus);

router.post("/:orderId/generate-delivery-token", requiredSignIn, isAdmin, generateDeliveryToken);

router.get("/", requiredSignIn, isAdmin, getAllOrders);
router.get("/return-orders", requiredSignIn, isAdmin, getReturnOrders);
router.get("/admin/payment-details", requiredSignIn, isAdmin, getPaymentDetails);

router.get("/user/:userId", requiredSignIn, getUserOrders);
router.put("/cancel/:orderId", requiredSignIn, cancelOrder);

router.get("/:id", requiredSignIn, getOrderById);

export default router;