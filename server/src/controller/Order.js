// src/controller/Order.js
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/post.js";
import { sendMail } from "../utils/mailer.js";
import { sendSms } from "../utils/sms.js";

/* ---------------------- Helpers ---------------------- */

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
}

function generateDeliveryTokenString(len = 10) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let t = "";
  for (let i = 0; i < len; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t;
}

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function safeNotify({ mailTo, mailSubject, mailHtml, mailText, smsTo, smsBody }) {
  try {
    if (mailTo) await sendMail({ to: mailTo, subject: mailSubject, html: mailHtml, text: mailText });
  } catch (err) {
    console.warn("safeNotify - mail error:", err?.message || err);
  }
  try {
    if (smsTo) await sendSms({ to: smsTo, body: smsBody });
  } catch (err) {
    console.warn("safeNotify - sms error:", err?.message || err);
  }
}

function formatItemsHtml(items = []) {
  if (!Array.isArray(items) || items.length === 0) return "<p>No items</p>";
  const rows = items
    .map((it) => {
      const prod = it.product || {};
      const title = prod.title || prod.name || "Product";
      const qty = it.quantity || 0;
      const price = it.priceAtPurchase ?? prod.price ?? 0;
      const lineTotal = price * qty;
      return `<tr>
      <td style="padding:6px 12px;border-bottom:1px solid #eee">${title}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center">${qty}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">₹${price}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">₹${lineTotal}</td>
    </tr>`;
    })
    .join("");
  return `
    <table style="width:100%;border-collapse:collapse;margin-top:6px">
      <thead><tr>
        <th style="text-align:left;padding:6px 12px;border-bottom:1px solid #ddd">Product</th>
        <th style="text-align:center;padding:6px 12px;border-bottom:1px solid #ddd">Qty</th>
        <th style="text-align:right;padding:6px 12px;border-bottom:1px solid #ddd">Price</th>
        <th style="text-align:right;padding:6px 12px;border-bottom:1px solid #ddd">Line</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function formatItemsText(items = []) {
  if (!Array.isArray(items) || items.length === 0) return "No items";
  return items
    .map((it) => {
      const prod = it.product || {};
      const title = prod.title || prod.name || "Product";
      const qty = it.quantity || 0;
      const price = it.priceAtPurchase ?? prod.price ?? 0;
      const lineTotal = price * qty;
      return `${title} — Qty: ${qty} — ₹${price} — Line: ₹${lineTotal}`;
    })
    .join("\n");
}

function otpMessageText(otp, minutes = 10) {
  return `Your verification code is ${otp}. It expires in ${minutes} minutes. Do not share this code with anyone.`;
}
function otpMessageHtml(otp, minutes = 10) {
  return `<p>Your verification code is <strong>${otp}</strong>. It expires in ${minutes} minutes.</p><p>Do not share this code with anyone.</p>`;
}

function stripOtp(orderObj) {
  if (orderObj?.paymentVerification) {
    delete orderObj.paymentVerification.otp;
    delete orderObj.paymentVerification.otpExpires;
  }
  return orderObj;
}

// Works whether order.user is a bare ObjectId or a populated document
function ownerIdOf(order) {
  return String(order?.user?._id || order?.user || "");
}

/* ---------------------- Controllers ---------------------- */

/**
 * POST /api/orders/create
 */
export const createOrder = async (req, res) => {
  try {
    const { items, address, paymentMethod, userId: bodyUserId } = req.body;
    const userId = bodyUserId || req.user?.id || req.user?._id;
    if (!userId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const orderItems = await Promise.all(
      items.map(async (item) => {
        const product = await Product.findById(item.productId);
        if (!product) throw new Error(`Product not found: ${item.productId}`);
        return {
          product: product._id,
          quantity: item.quantity,
          priceAtPurchase: product.price ?? 0,
        };
      })
    );

    const total = orderItems.reduce((acc, it) => acc + it.priceAtPurchase * it.quantity, 0);

    const newOrder = new Order({
      user: userId,
      items: orderItems,
      total,
      address,
      paymentMethod: paymentMethod || "COD",
      status: "Pending",
      returnRefund: { status: "Not Requested" },
    });

    // Generate OTP (backwards compatible) - optional
    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    newOrder.paymentVerification = {
      method: "Both",
      otp,
      otpExpires,
      status: "Pending",
    };

    await newOrder.save();
    await newOrder.populate("items.product", "title name images price");
    await newOrder.populate("user", "name email");

    const safeOrder = stripOtp(newOrder.toObject());

    // Notifications (non-blocking)
    (async () => {
      try {
        const itemsHtml = formatItemsHtml(newOrder.items);
        const itemsText = formatItemsText(newOrder.items);

        if (process.env.ADMIN_EMAIL || process.env.ADMIN_PHONE) {
          const subject = `[${process.env.APP_NAME || "App"}] New order placed (${String(newOrder._id).slice(-6)})`;
          const html = `<p>New order placed.</p><p>Order ID: <strong>${newOrder._id}</strong></p>${itemsHtml}<p><strong>Total:</strong> ₹${newOrder.total}</p>`;
          const sms = `${process.env.APP_NAME || "App"}: New order ${String(newOrder._id).slice(-6)} placed. Total ₹${newOrder.total}.`;
          await safeNotify({
            mailTo: process.env.ADMIN_EMAIL,
            mailSubject: subject,
            mailHtml: html,
            mailText: `${subject}\n\n${itemsText}\n\nTotal: ₹${newOrder.total}`,
            smsTo: process.env.ADMIN_PHONE,
            smsBody: sms,
          });
        }

        const userEmail = newOrder.user?.email || newOrder.address?.email;
        const userPhone = newOrder.address?.mobileNo;
        if (userEmail || userPhone) {
          const subject = `[${process.env.APP_NAME || "App"}] Verify for order ${String(newOrder._id).slice(-6)}`;
          const html = `<p>Thanks — your order <strong>${newOrder._id}</strong> has been placed. Use the code below to confirm delivery when completing the order.</p>${itemsHtml}${otpMessageHtml(otp, 10)}<p><strong>Total:</strong> ₹${newOrder.total}</p>`;
          const text = `Order ${newOrder._id} placed. ${itemsText}\n\n${otpMessageText(otp, 10)}\n\nTotal: ₹${newOrder.total}`;
          const smsBody = `${process.env.APP_NAME || "App"}: Order ${String(newOrder._id).slice(-6)} placed. ${otpMessageText(otp, 10)}`;
          await safeNotify({
            mailTo: userEmail,
            mailSubject: subject,
            mailHtml: html,
            mailText: text,
            smsTo: userPhone,
            smsBody,
          });
        }
      } catch (err) {
        console.warn("create notifications err:", err);
      }
    })();

    res.json({ success: true, message: "Order created", order: safeOrder });
  } catch (err) {
    console.error("POST /create order error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/orders/public/:id
 */
export const getPublicOrder = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order id" });
    }

    const order = await Order.findById(id)
      .populate("items.product", "title name images price")
      .populate("user", "name email");

    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const safe = stripOtp(order.toObject());

    res.json({ success: true, order: safe });
  } catch (err) {
    console.error("GET /public/:id error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/orders/public/:id/send-otp
 */
export const sendPublicOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid order id" });

    const order = await Order.findById(id).populate("user", "name email");
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const storedEmails = new Set();
    if (order.user?.email) storedEmails.add(String(order.user.email).toLowerCase());
    if (order.address?.email) storedEmails.add(String(order.address.email).toLowerCase());

    if (email) {
      if (!storedEmails.size) {
        return res.status(400).json({ success: false, message: "No customer email on record for this order" });
      }
      const normalized = String(email).trim().toLowerCase();
      if (!storedEmails.has(normalized)) {
        return res.status(403).json({ success: false, message: "Provided email does not match the order's customer email" });
      }
    }

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    order.paymentVerification = {
      method: order.paymentVerification?.method || "Both",
      otp,
      otpExpires,
      status: "Pending",
      verifiedAt: null,
    };

    await order.save();

    (async () => {
      try {
        const userEmail = email || order.user?.email || order.address?.email;
        const userPhone = order.address?.mobileNo;
        const shortId = String(order._id).slice(-6);
        const subject = `[${process.env.APP_NAME || "App"}] Your delivery OTP for order ${shortId}`;
        const html = `<p>Your delivery OTP is <strong>${otp}</strong>. It expires in 10 minutes.</p>`;
        const text = `Your delivery OTP is ${otp}. It expires in 10 minutes.`;

        if (userEmail) {
          await safeNotify({
            mailTo: userEmail,
            mailSubject: subject,
            mailHtml: html,
            mailText: text,
          });
        }

        if (userPhone) {
          const sms = `${process.env.APP_NAME || "App"}: OTP ${otp} for order ${shortId}. Expires in 10 min.`;
          await safeNotify({ smsTo: userPhone, smsBody: sms });
        }
      } catch (notifyErr) {
        console.warn("public send-otp notify err:", notifyErr);
      }
    })();

    const safe = order.toObject();
    if (safe.paymentVerification) {
      if (process.env.DEBUG === "true") {
        safe.paymentVerification._debugOtp = order.paymentVerification.otp;
      }
      delete safe.paymentVerification.otp;
      delete safe.paymentVerification.otpExpires;
    }

    res.json({ success: true, message: "OTP sent to customer (email/SMS) if available", order: safe });
  } catch (err) {
    console.error("POST /public/:id/send-otp error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/orders/public/:id/deliver
 */
export const publicDeliver = async (req, res) => {
  try {
    const { id } = req.params;
    const providedToken = (req.body && req.body.token) || req.query.t || null;

    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: "Invalid order id" });

    // Load order deliveryToken presence and status
    const order = await Order.findById(id).select("deliveryToken status").lean();
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const now = new Date();

    // If order has a delivery token configured, require token and consume it atomically
    if (order.deliveryToken && order.deliveryToken.token) {
      if (!providedToken) {
        return res.status(400).json({ success: false, message: "Delivery token required" });
      }

      const filter = {
        _id: id,
        "deliveryToken.token": String(providedToken).trim(),
        "deliveryToken.used": false,
        status: { $ne: "Delivered" },
      };
      if (order.deliveryToken.expiresAt) filter["deliveryToken.expiresAt"] = { $gt: now };

      const update = {
        $set: {
          status: "Delivered",
          "paymentVerification.status": "Verified",
          "paymentVerification.verifiedAt": now,
          "deliveryToken.used": true,
          "deliveryToken.usedAt": now,
          updatedAt: now,
        },
      };

      const updated = await Order.findOneAndUpdate(filter, update, { new: true })
        .populate("items.product", "title name images price")
        .populate("user", "name email");

      if (!updated) {
        const current = await Order.findById(id).select("deliveryToken status").lean();
        if (!current) return res.status(404).json({ success: false, message: "Order not found" });

        if (current.status === "Delivered") {
          const already = await Order.findById(id).populate("items.product", "title name images price").populate("user", "name email");
          const safeAlready = stripOtp(already.toObject());
          return res.json({ success: true, message: "Order already delivered", order: safeAlready });
        }

        if (!current.deliveryToken || !current.deliveryToken.token) {
          return res.status(400).json({ success: false, message: "Delivery token not configured for this order" });
        }
        if (current.deliveryToken.used) {
          return res.status(400).json({ success: false, message: "Delivery token already used" });
        }
        if (current.deliveryToken.expiresAt && new Date(current.deliveryToken.expiresAt) <= now) {
          return res.status(400).json({ success: false, message: "Delivery token expired" });
        }

        return res.status(400).json({ success: false, message: "Invalid delivery token" });
      }

      const safe = stripOtp(updated.toObject());

      (async () => {
        try {
          const shortId = String(updated._id).slice(-6);
          const userEmail = updated.user?.email || updated.address?.email;
          const userPhone = updated.address?.mobileNo;
          const adminEmail = process.env.ADMIN_EMAIL;
          const adminPhone = process.env.ADMIN_PHONE;

          await safeNotify({
            mailTo: userEmail,
            mailSubject: `[${process.env.APP_NAME || "App"}] Your order ${shortId} delivered`,
            mailHtml: `<p>Your order <strong>${shortId}</strong> has been delivered.</p>`,
            mailText: `Your order ${shortId} has been delivered.`,
            smsTo: userPhone,
            smsBody: `${process.env.APP_NAME || "App"}: Order ${shortId} delivered.`,
          });

          await safeNotify({
            mailTo: adminEmail,
            mailSubject: `[${process.env.APP_NAME || "App"}] Order ${shortId} delivered`,
            mailHtml: `<p>Order ${shortId} was delivered via token-based scan.</p>`,
            mailText: `Order ${shortId} delivered.`,
            smsTo: adminPhone,
            smsBody: `${process.env.APP_NAME || "App"}: Order ${shortId} delivered.`,
          });
        } catch (nerr) {
          console.warn("public deliver (token) notify err:", nerr);
        }
      })();

      return res.json({ success: true, message: "Order marked as delivered", order: safe });
    }

    // No token configured — fallback: immediate deliver
    const updatedFallback = await Order.findOneAndUpdate(
      { _id: id, status: { $ne: "Delivered" } },
      { $set: { status: "Delivered", "paymentVerification.status": "Verified", "paymentVerification.verifiedAt": now, updatedAt: now } },
      { new: true }
    )
      .populate("items.product", "title name images price")
      .populate("user", "name email");

    if (!updatedFallback) {
      const maybe = await Order.findById(id).populate("user", "name email");
      if (!maybe) return res.status(404).json({ success: false, message: "Order not found" });
      if (maybe.status === "Delivered") {
        const safeAlready = stripOtp(maybe.toObject());
        return res.json({ success: true, message: "Order already delivered", order: safeAlready });
      }
      return res.status(400).json({ success: false, message: "Failed to mark delivered" });
    }

    const safeFallback = stripOtp(updatedFallback.toObject());

    (async () => {
      try {
        const shortId = String(updatedFallback._id).slice(-6);
        const userEmail = updatedFallback.user?.email || updatedFallback.address?.email;
        const userPhone = updatedFallback.address?.mobileNo;
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPhone = process.env.ADMIN_PHONE;

        await safeNotify({
          mailTo: userEmail,
          mailSubject: `[${process.env.APP_NAME || "App"}] Your order ${shortId} delivered`,
          mailHtml: `<p>Your order <strong>${shortId}</strong> has been delivered.</p>`,
          mailText: `Your order ${shortId} has been delivered.`,
          smsTo: userPhone,
          smsBody: `${process.env.APP_NAME || "App"}: Order ${shortId} delivered.`,
        });

        await safeNotify({
          mailTo: adminEmail,
          mailSubject: `[${process.env.APP_NAME || "App"}] Order ${shortId} delivered`,
          mailHtml: `<p>Order ${shortId} was delivered via public deliver endpoint.</p>`,
          mailText: `Order ${shortId} delivered.`,
          smsTo: adminPhone,
          smsBody: `${process.env.APP_NAME || "App"}: Order ${shortId} delivered.`,
        });
      } catch (nerr) {
        console.warn("public deliver (fallback) notify err:", nerr);
      }
    })();

    return res.json({ success: true, message: "Order marked as delivered", order: safeFallback });
  } catch (err) {
    console.error("PUT /public/:id/deliver error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/orders/resend-otp/:orderId
 */
export const resendOtp = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ success: false, message: "Invalid order id" });

    const order = await Order.findById(orderId).populate("user", "name email");
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const requestingUserId = req.user?.id || req.user?._id;
    if (ownerIdOf(order) !== String(requestingUserId) && req.user?.role !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const otp = generateOtp();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    order.paymentVerification = {
      method: order.paymentVerification?.method || "Both",
      otp,
      otpExpires,
      status: "Pending",
      verifiedAt: null,
    };
    await order.save();

    (async () => {
      try {
        const userEmail = order.user?.email || order.address?.email;
        const userPhone = order.address?.mobileNo;
        if (userEmail) {
          await safeNotify({
            mailTo: userEmail,
            mailSubject: `[${process.env.APP_NAME || "App"}] Your verification code for order ${order._id}`,
            mailHtml: otpMessageHtml(otp, 10),
            mailText: otpMessageText(otp, 10),
          });
        }
        if (userPhone) {
          await safeNotify({
            smsTo: userPhone,
            smsBody: `${process.env.APP_NAME || "App"}: ${otpMessageText(otp, 10)} Order: ${String(order._id).slice(-6)}`,
          });
        }
      } catch (err) {
        console.warn("resend otp notify err:", err);
      }
    })();

    res.json({ success: true, message: "OTP resent" });
  } catch (err) {
    console.error("POST /resend-otp error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/orders/verify-payment/:orderId  Body: { otp }
 */
export const verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ success: false, message: "OTP required" });

    if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ success: false, message: "Invalid order id" });

    const order = await Order.findById(orderId).populate("user", "name email");
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const requestingUserId = req.user?.id || req.user?._id;
    if (ownerIdOf(order) !== String(requestingUserId) && req.user?.role !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (!order.paymentVerification || !order.paymentVerification.otp) return res.status(400).json({ success: false, message: "No OTP for this order" });
    if (order.paymentVerification.otpExpires && new Date() > new Date(order.paymentVerification.otpExpires)) return res.status(400).json({ success: false, message: "OTP expired. Resend and try again." });
    if (String(order.paymentVerification.otp).trim() !== String(otp).trim()) return res.status(400).json({ success: false, message: "Invalid OTP" });

    order.paymentVerification.status = "Verified";
    order.paymentVerification.verifiedAt = new Date();
    await order.save();
    await order.populate("items.product", "title images price");
    await order.populate("user", "name email");

    const safe = stripOtp(order.toObject());

    (async () => {
      try {
        const userEmail = order.user?.email || order.address?.email;
        const userPhone = order.address?.mobileNo;
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPhone = process.env.ADMIN_PHONE;

        if (userEmail || userPhone) {
          await safeNotify({
            mailTo: userEmail,
            mailSubject: `[${process.env.APP_NAME || "App"}] Verified for order ${order._id}`,
            mailHtml: `<p>Your verification for order <strong>${order._id}</strong> is successful.</p>`,
            mailText: `Verification for order ${order._id} successful.`,
            smsTo: userPhone,
            smsBody: `${process.env.APP_NAME || "App"}: Verified for order ${String(order._id).slice(-6)}.`,
          });
        }

        await safeNotify({
          mailTo: adminEmail,
          mailSubject: `[${process.env.APP_NAME || "App"}] Order payment verified - ${order._id}`,
          mailHtml: `<p>Order ${order._id} payment verification successful.</p>`,
          mailText: `Order ${order._id} payment verification successful.`,
          smsTo: adminPhone,
          smsBody: `${process.env.APP_NAME || "App"}: Payment verified for ${String(order._id).slice(-6)}.`,
        });
      } catch (err) {
        console.warn("verify notify err:", err);
      }
    })();

    res.json({ success: true, message: "Payment verified", order: safe });
  } catch (err) {
    console.error("POST /verify-payment error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/orders/:orderId/deliver
 */
export const protectedDeliver = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { otp } = req.body;
    const callerId = req.user?.id || req.user?._id;
    const isAdminUser = req.user?.role === "admin";

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: "Invalid order id" });
    }

    if (isAdminUser) {
      const updated = await Order.findByIdAndUpdate(
        orderId,
        { $set: { status: "Delivered", updatedAt: new Date() } },
        { new: true }
      )
        .populate("items.product", "title name images price")
        .populate("user", "name email");

      if (!updated) return res.status(404).json({ success: false, message: "Order not found" });

      const safe = stripOtp(updated.toObject());
      return res.json({ success: true, message: "Order marked delivered by admin", order: safe });
    }

    const order = await Order.findById(orderId).populate("user", "name email");
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const isOwner = ownerIdOf(order) === String(callerId);
    const isCourier = req.user?.role === "courier";
    if (!isOwner && !isCourier) {
      return res.status(403).json({ success: false, message: "Not authorized to mark delivered" });
    }

    if (!order.paymentVerification || !order.paymentVerification.otp) {
      return res.status(400).json({ success: false, message: "No OTP configured for this order. Send OTP first." });
    }

    if (!otp) return res.status(400).json({ success: false, message: "OTP required" });

    const now = new Date();
    const updated = await Order.findOneAndUpdate(
      {
        _id: orderId,
        "paymentVerification.otp": String(otp).trim(),
        "paymentVerification.otpExpires": { $gt: now },
      },
      {
        $set: {
          "paymentVerification.status": "Verified",
          "paymentVerification.verifiedAt": now,
          status: "Delivered",
          updatedAt: now,
        },
      },
      { new: true }
    )
      .populate("items.product", "title name images price")
      .populate("user", "name email");

    if (!updated) {
      const fresh = await Order.findById(orderId);
      if (!fresh.paymentVerification || !fresh.paymentVerification.otp) {
        return res.status(400).json({ success: false, message: "No OTP configured for this order. Send OTP first." });
      }
      if (fresh.paymentVerification.otpExpires && new Date() > new Date(fresh.paymentVerification.otpExpires)) {
        return res.status(400).json({ success: false, message: "OTP expired. Please resend and try again." });
      }
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    const safe = stripOtp(updated.toObject());

    (async () => {
      try {
        const shortId = String(updated._id).slice(-6);
        const userEmail = updated.user?.email || updated.address?.email;
        const userPhone = updated.address?.mobileNo;
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPhone = process.env.ADMIN_PHONE;

        await safeNotify({
          mailTo: userEmail,
          mailSubject: `[${process.env.APP_NAME || "App"}] Order delivered (${shortId})`,
          mailHtml: `<p>Your order <strong>${shortId}</strong> has been delivered.</p>`,
          mailText: `Order ${shortId} delivered.`,
          smsTo: userPhone,
          smsBody: `${process.env.APP_NAME || "App"}: Order ${shortId} delivered.`,
        });

        await safeNotify({
          mailTo: adminEmail,
          mailSubject: `[${process.env.APP_NAME || "App"}] Order ${shortId} delivered`,
          mailHtml: `<p>Order ${shortId} has been delivered (marked by user/courier).</p>`,
          mailText: `Order ${shortId} delivered.`,
          smsTo: adminPhone,
          smsBody: `${process.env.APP_NAME || "App"}: Order ${shortId} delivered.`,
        });
      } catch (nerr) {
        console.warn("protected deliver notify err:", nerr);
      }
    })();

    return res.json({ success: true, message: "Order marked as delivered", order: safe });
  } catch (err) {
    console.error("PUT /:orderId/deliver error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/orders/status/:orderId  (admin)
 */
export const updateStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const allowed = ["Pending", "Accepted", "Confirmed", "Shipped", "Out for Delivery", "Delivered", "Cancelled", "Pending Pickup", "Collected"];
    if (!allowed.includes(status)) return res.status(400).json({ success: false, message: "Invalid status" });

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: "Invalid order id" });
    }

    const order = await Order.findById(orderId).populate("user", "name email").populate("items.product", "title name images price");
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    order.status = status;
    await order.save();
    await order.populate("items.product", "title name images price");
    await order.populate("user", "name email");

    const itemsHtml = formatItemsHtml(order.items);
    const itemsText = formatItemsText(order.items);

    (async () => {
      try {
        const userEmail = order.user?.email;
        const userPhone = order.address?.mobileNo;
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPhone = process.env.ADMIN_PHONE;
        const shortId = String(order._id).slice(-6);

        const subjectUser = `[${process.env.APP_NAME || "App"}] Order ${status} (${order._id})`;
        const htmlUser = `<p>Your order <strong>${order._id}</strong> is now <strong>${status}</strong>.</p>${itemsHtml}<p><strong>Total:</strong> ₹${order.total}</p>`;
        const smsUser = `${process.env.APP_NAME || "App"}: Order ${shortId} is ${status}.`;

        await safeNotify({
          mailTo: userEmail,
          mailSubject: subjectUser,
          mailHtml: htmlUser,
          mailText: `Order ${order._id} is ${status}.\n\n${itemsText}\n\nTotal: ₹${order.total}.`,
          smsTo: userPhone,
          smsBody: smsUser,
        });

        await safeNotify({
          mailTo: adminEmail,
          mailSubject: `[${process.env.APP_NAME || "App"}] Order ${status} - ${order._id}`,
          mailHtml: `<p>Order ${order._id} status changed to ${status} by admin.</p>${itemsHtml}<p><strong>Total:</strong> ₹${order.total}</p>`,
          mailText: `Order ${order._id} status changed to ${status}.\n\n${itemsText}\n\nTotal: ₹${order.total}.`,
          smsTo: adminPhone,
          smsBody: `${process.env.APP_NAME || "App"}: Order ${shortId} marked ${status}.`,
        });
      } catch (err) {
        console.warn("Status change notification error:", err);
      }
    })();

    const safeOrder = stripOtp(order.toObject());

    res.json({ success: true, message: "Order status updated", order: safeOrder });
  } catch (err) {
    console.error("PUT /status/:orderId error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/orders/return/:orderId
 * Submit a refund request (order owner, or admin).
 *
 * FIX: `user` is deliberately NOT populated before the ownership check, so
 * order.user is a plain ObjectId and the comparison is reliable. The user is
 * populated only after the check, for the response and notifications.
 *
 * FIX: requiredSignIn now puts the DB role on req.user, so the admin bypass
 * works without an extra query here.
 */
export const requestReturn = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { type, reason, upi } = req.body || {};
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: "Invalid order id" });
    }

    // No populate("user") here — keep order.user as a bare id for the check
    const order = await Order.findById(orderId).populate("items.product", "title images price");
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const isOwner = ownerIdOf(order) === String(userId);
    const isAdminUser = req.user?.role === "admin";

    if (!isOwner && !isAdminUser) {
      console.warn("[requestReturn] 403", {
        tokenUserId: String(userId),
        orderOwnerId: ownerIdOf(order),
        role: req.user?.role,
      });
      return res.status(403).json({ success: false, message: "Not authorized to request return for this order" });
    }

    if (order.status !== "Delivered") {
      return res.status(400).json({ success: false, message: "Return/refund allowed only after delivery" });
    }

    if (type && type !== "Refund") {
      return res.status(400).json({ success: false, message: "Only refund requests are supported" });
    }
    if (!upi || !String(upi).trim()) {
      return res.status(400).json({ success: false, message: "UPI ID is required for a refund" });
    }

    const existingStatus = order.returnRefund?.status;
    if (existingStatus && existingStatus !== "Not Requested") {
      return res.status(400).json({ success: false, message: "A return/refund request already exists for this order" });
    }

    if (!order.returnRefund) order.returnRefund = {};

    order.returnRefund.requestType = "Refund";
    order.returnRefund.reason = String(reason || "").trim();
    order.returnRefund.upi = String(upi).trim();
    order.returnRefund.status = "Requested";
    order.returnRefund.requestDate = new Date();

    await order.save();
    await order.populate("items.product", "title images price");
    await order.populate("user", "name email");

    (async () => {
      try {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPhone = process.env.ADMIN_PHONE;
        const itemsHtml = formatItemsHtml(order.items);
        const itemsText = formatItemsText(order.items);
        const subj = `[${process.env.APP_NAME || "App"}] Return requested (${order._id})`;
        await safeNotify({
          mailTo: adminEmail,
          mailSubject: subj,
          mailHtml: `<p>Return requested for order ${order._id}</p>${itemsHtml}<p>Reason: ${escapeHtml(order.returnRefund.reason)}</p>`,
          mailText: `Return requested for order ${order._id}\n\n${itemsText}\n\nReason: ${order.returnRefund.reason}`,
          smsTo: adminPhone,
          smsBody: `${process.env.APP_NAME || "App"}: Return requested for order ${String(order._id).slice(-6)}.`,
        });

        const userEmail = order.user?.email;
        const userPhone = order.address?.mobileNo;
        if (userEmail || userPhone) {
          await safeNotify({
            mailTo: userEmail,
            mailSubject: `[${process.env.APP_NAME || "App"}] Return request received (${order._id})`,
            mailHtml: `<p>Return request received for ${order._id}. We'll update you shortly.</p>${itemsHtml}`,
            mailText: `Return request received for ${order._id}.\n\n${itemsText}`,
            smsTo: userPhone,
            smsBody: `${process.env.APP_NAME || "App"}: Return request received for order ${String(order._id).slice(-6)}.`,
          });
        }
      } catch (err) {
        console.warn("return notify err:", err);
      }
    })();

    const safe = stripOtp(order.toObject());

    res.json({ success: true, message: "Return/refund request submitted", order: safe });
  } catch (err) {
    console.error("POST /return/:orderId error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/orders/return/:orderId (admin)
 * Approve / Reject / Mark Collected for return/refund
 */
export const updateReturnStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { action } = req.body;
    if (!["Approved", "Rejected", "Collected"].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid action" });
    }
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: "Invalid order id" });
    }

    const order = await Order.findById(orderId).populate("items.product", "title images price").populate("user", "name email");
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    if (!order.returnRefund || !order.returnRefund.status || order.returnRefund.status === "Not Requested") {
      return res.status(400).json({ success: false, message: "No return/refund request on this order" });
    }

    if (action === "Approved") {
      order.returnRefund.status = "Approved";
      order.returnRefund.acceptedBy = req.user?.id || req.user?._id || null;
      order.returnRefund.acceptedAt = new Date();
      order.status = "Pending Pickup";
    } else if (action === "Rejected") {
      order.returnRefund.status = "Rejected";
    } else if (action === "Collected") {
      order.returnRefund.status = "Collected";
      order.returnRefund.collectedAt = new Date();
      order.status = "Collected";
    }

    await order.save();
    await order.populate("items.product", "title images price");
    await order.populate("user", "name email");

    (async () => {
      try {
        const userEmail = order.user?.email;
        const userPhone = order.address?.mobileNo;
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPhone = process.env.ADMIN_PHONE;
        const itemsHtml = formatItemsHtml(order.items);
        if (action === "Approved") {
          await safeNotify({
            mailTo: userEmail,
            mailSubject: `[${process.env.APP_NAME || "App"}] Your return request approved (${order._id})`,
            mailHtml: `<p>Your return for ${order._id} is approved.</p>${itemsHtml}`,
            mailText: `Your return for ${order._id} is approved.`,
            smsTo: userPhone,
            smsBody: `${process.env.APP_NAME || "App"}: Return approved for order ${String(order._id).slice(-6)}.`,
          });
        } else if (action === "Rejected") {
          await safeNotify({
            mailTo: userEmail,
            mailSubject: `[${process.env.APP_NAME || "App"}] Your return request rejected (${order._id})`,
            mailHtml: `<p>Your return for ${order._id} was rejected.</p>${itemsHtml}`,
            mailText: `Your return for ${order._id} was rejected.`,
            smsTo: userPhone,
            smsBody: `${process.env.APP_NAME || "App"}: Return rejected for order ${String(order._id).slice(-6)}.`,
          });
        } else if (action === "Collected") {
          await safeNotify({
            mailTo: userEmail,
            mailSubject: `[${process.env.APP_NAME || "App"}] Return collected (${order._id})`,
            mailHtml: `<p>Pickup collected for ${order._id}.</p>${itemsHtml}`,
            mailText: `Pickup collected for ${order._id}.`,
            smsTo: userPhone,
            smsBody: `${process.env.APP_NAME || "App"}: Return collected for order ${String(order._id).slice(-6)}.`,
          });
        }

        await safeNotify({
          mailTo: adminEmail,
          mailSubject: `[${process.env.APP_NAME || "App"}] Return ${action} - ${order._id}`,
          mailHtml: `<p>Return ${action} for ${order._id}</p>`,
          mailText: `Return ${action} for ${order._id}`,
          smsTo: adminPhone,
          smsBody: `${process.env.APP_NAME || "App"}: Return ${action} for order ${String(order._id).slice(-6)}.`,
        });
      } catch (err) {
        console.warn("return action notify err:", err);
      }
    })();

    const safe = stripOtp(order.toObject());

    res.json({ success: true, message: "Return/refund updated", order: safe });
  } catch (err) {
    console.error("PUT /return/:orderId error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/orders/:orderId/generate-delivery-token (admin)
 */
export const generateDeliveryToken = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) return res.status(400).json({ success: false, message: "Invalid order id" });

    const ttlMinutes = parseInt(req.body?.ttlMinutes) || 60 * 24 * 7; // default 7 days
    const token = generateDeliveryTokenString(10);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    const updated = await Order.findByIdAndUpdate(
      orderId,
      {
        $set: {
          "deliveryToken.token": token,
          "deliveryToken.expiresAt": expiresAt,
          "deliveryToken.used": false,
          "deliveryToken.usedAt": null,
          "deliveryToken.createdAt": new Date(),
        },
      },
      { new: true }
    );

    if (!updated) return res.status(404).json({ success: false, message: "Order not found" });

    return res.json({ success: true, message: "Delivery token generated", token, expiresAt, orderId });
  } catch (err) {
    console.error("POST /:orderId/generate-delivery-token error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/orders (admin, optional ?status=)
 */
export const getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status && status !== "All" ? { status } : {};
    const orders = await Order.find(filter)
      .populate("items.product", "title name images price")
      .populate("user", "name email");

    const safe = orders.map((o) => stripOtp(o.toObject()));

    res.json({ success: true, orders: safe });
  } catch (err) {
    console.error("GET / orders error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/orders/return-orders (admin)
 */
export const getReturnOrders = async (req, res) => {
  try {
    const orders = await Order.find({ "returnRefund.status": { $in: ["Requested", "Approved", "Pending Pickup"] } })
      .populate("items.product", "title images price")
      .populate("user", "name email");

    const safe = orders.map((o) => stripOtp(o.toObject()));

    res.json({ success: true, returnOrders: safe });
  } catch (err) {
    console.error("GET /return-orders error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/orders/user/:userId
 */
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.params.userId;
    const requestingUserId = req.user?.id || req.user?._id;
    if (!requestingUserId) return res.status(401).json({ success: false, message: "Unauthorized" });

    if (String(requestingUserId) !== String(userId) && req.user?.role !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const orders = await Order.find({ user: userId })
      .populate("items.product", "title name images price")
      .populate("user", "name email");

    const safe = orders.map((o) => stripOtp(o.toObject()));

    res.json({ success: true, orders: safe });
  } catch (err) {
    console.error("GET /user/:userId error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/orders/cancel/:orderId
 */
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({ success: false, message: "Invalid order id" });
    }

    const order = await Order.findById(orderId)
      .populate("items.product", "title name images price")
      .populate("user", "name email");
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const requestingUserId = req.user?.id || req.user?._id;
    const isOwner = ownerIdOf(order) === String(requestingUserId);
    const adminFlag = req.user?.role === "admin";

    if (!isOwner && !adminFlag) {
      return res.status(403).json({ success: false, message: "Not authorized to cancel" });
    }

    if (!["Pending", "Accepted"].includes(order.status)) {
      return res.status(400).json({ success: false, message: "Cannot cancel after shipping" });
    }

    order.status = "Cancelled";
    await order.save();

    (async () => {
      try {
        const itemsHtml = formatItemsHtml(order.items);
        const itemsText = formatItemsText(order.items);

        const userEmail = order.address?.email || order.user?.email || null;
        const userPhone = order.address?.mobileNo || null;
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPhone = process.env.ADMIN_PHONE;

        const subjectUser = `[${process.env.APP_NAME || "App"}] Order cancelled (${order._id})`;
        const htmlUser = `<p>Your order <strong>${order._id}</strong> has been cancelled.</p>${itemsHtml}<p><strong>Total:</strong> ₹${order.total}</p>`;
        const smsUser = `${process.env.APP_NAME || "App"}: Order ${String(order._id).slice(-6)} cancelled.`;

        await safeNotify({
          mailTo: userEmail,
          mailSubject: subjectUser,
          mailHtml: htmlUser,
          mailText: `Order ${order._id} cancelled.\n\n${itemsText}\n\nTotal: ₹${order.total}.`,
          smsTo: userPhone,
          smsBody: smsUser,
        });

        await safeNotify({
          mailTo: adminEmail,
          mailSubject: `[${process.env.APP_NAME || "App"}] Order cancelled ${order._id}`,
          mailHtml: `<p>Order ${order._id} was cancelled by ${req.user?.id || "admin"}.</p>${itemsHtml}<p><strong>Total:</strong> ₹${order.total}</p>`,
          mailText: `Order ${order._id} cancelled by ${req.user?.id || "admin"}.\n\n${itemsText}\n\nTotal: ₹${order.total}.`,
          smsTo: adminPhone,
          smsBody: `${process.env.APP_NAME || "App"}: Order ${String(order._id).slice(-6)} cancelled.`,
        });
      } catch (err) {
        console.warn("Cancellation notification err:", err);
      }
    })();

    const safeObj = stripOtp(order.toObject());

    res.json({ success: true, message: "Order cancelled successfully", order: safeObj });
  } catch (err) {
    console.error("PUT /cancel/:orderId error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/orders/:id
 */
export const getOrderById = async (req, res) => {
  try {
    const param = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(param)) {
      return res.status(400).json({ success: false, message: "Invalid order id" });
    }

    const order = await Order.findById(param)
      .populate("items.product", "title name images price")
      .populate("user", "name email");
    if (!order) return res.status(404).json({ success: false, message: "Order not found" });

    const requestingUserId = req.user?.id || req.user?._id;
    if (ownerIdOf(order) !== String(requestingUserId) && req.user?.role !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const safe = stripOtp(order.toObject());

    res.json({ success: true, order: safe });
  } catch (err) {
    console.error("GET /:id order error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/orders/admin/payment-details (admin)
 * Lightweight, payment-focused list for an admin "Payments" panel.
 */
export const getPaymentDetails = async (req, res) => {
  try {
    const { status } = req.query; // optional: Pending | Verified
    const filter = {};
    if (status && ["Pending", "Verified"].includes(status)) {
      filter["paymentVerification.status"] = status;
    }

    const orders = await Order.find(filter)
      .select("total paymentMethod paymentVerification.status paymentVerification.verifiedAt paymentVerification.method createdAt user")
      .populate("user", "name email")
      .sort({ createdAt: -1 });

    const payments = orders.map((o) => ({
      orderId: o._id,
      user: o.user ? { name: o.user.name, email: o.user.email } : null,
      total: o.total,
      paymentMethod: o.paymentMethod,
      verificationMethod: o.paymentVerification?.method || null,
      verificationStatus: o.paymentVerification?.status || "Pending",
      verifiedAt: o.paymentVerification?.verifiedAt || null,
      createdAt: o.createdAt,
    }));

    res.json({ success: true, payments });
  } catch (err) {
    console.error("GET /admin/payment-details error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};