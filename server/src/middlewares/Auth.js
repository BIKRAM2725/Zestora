

// import jwt from "jsonwebtoken";
// import User from "../models/user.js";

// export const requiredSignIn = (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;
//     if (!authHeader) return res.status(401).json({ message: "No token" });

//     const token = authHeader.split(" ")[1];
//     if (!token) return res.status(401).json({ message: "Invalid token format" });

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded;
//     next();
//   } catch (error) {
//     return res.status(401).json({ message: "Invalid token" });
//   }
// };

// export const isAdmin = async (req, res, next) => {
//   try {
//     const user = await User.findById(req.user.id);
//     if (!user) return res.status(404).json({ message: "User not found" });
//     if (user.role !== "admin") return res.status(403).json({ message: "Admin access required" });
//     next();
//   } catch (error) {
//     res.status(500).json({ message: "Server error" });
//   }
// };

// src/middlewares/Auth.js
import jwt from "jsonwebtoken";
import User from "../models/user.js";

/**
 * Verifies the JWT and loads the user's CURRENT role from the DB.
 * The token only carries `id`, so role must be looked up here.
 * After this runs: req.user = { id, iat, exp, role }
 */
export const requiredSignIn = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: "No token" });

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Invalid token format" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const dbUser = await User.findById(decoded.id).select("role").lean();
    if (!dbUser) return res.status(401).json({ message: "User no longer exists" });

    req.user = { ...decoded, role: dbUser.role };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

/**
 * Must run AFTER requiredSignIn (it relies on req.user.role).
 */
export const isAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};