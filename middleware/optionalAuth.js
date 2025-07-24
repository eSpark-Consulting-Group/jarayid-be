import jwt from "jsonwebtoken";
import { configs } from "../config/config.js";
import { PrismaClient } from "@prisma/client";
import response from "../utils/response.js";

const prisma = new PrismaClient();

/**
 * Optional authentication middleware
 * - If token is valid, attaches user to req.user
 * - If no token or invalid, continues without user info
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
console.log("optionalAuth token:", token);
    if (!token) {
      // No token — proceed without attaching user
      return next();
    }

    try {
      const decoded = jwt.verify(token, configs.JWT_SECRET_KEY);

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (user) {
        req.user = user;
      }
    } catch (err) {
      // Invalid token — proceed without attaching user
    }
console.log("optionalAuth user:", req.user);
    return next();
  } catch (error) {
    return response.error(res, "Optional auth failed", 500);
  }
};

export default optionalAuth;
