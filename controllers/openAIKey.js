// controllers/apiKeyController.js
import { response } from "../utils/index.js";
import winston from "winston";
import prisma from "../prisma/index.js";

// Logger configuration
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level.toUpperCase()}] ApiKey Controller: ${message} ${
        Object.keys(meta).length ? JSON.stringify(meta) : ""
      }`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

class ApiKeyController {
  constructor() {
    this.prisma = prisma;
  }

  // Get the current API Key (Admin only)
  async getApiKey(req, res) {
    try {
      const apiKey = await prisma.apiKey.findFirst({
        orderBy: { createdAt: "desc" },
      });

      if (!apiKey) {
        return response.error(res, "API key not found", 404);
      }

      return response.success(res, apiKey, "API key retrieved successfully");
    } catch (error) {
      logger.error("Get API key error:", {
        error: error?.message || error,
      });
      return response.error(res, "Failed to retrieve API key", 500);
    }
  }

  // Save or update API Key (Admin only)
  async saveApiKey(req, res) {
    const { key } = req.body;

    if (!key) {
      return response.error(res, "API key is required", 400);
    }

    try {
      const existing = await prisma.apiKey.findFirst();

      let savedKey;
      if (existing) {
        savedKey = await prisma.apiKey.update({
          where: { id: existing.id },
          data: { key },
        });
      } else {
        savedKey = await prisma.apiKey.create({
          data: { key },
        });
      }

      return response.success(res, savedKey, "API key saved successfully", 201);
    } catch (error) {
      logger.error("Save API key error:", {
        error: error?.message || error,
      });
      return response.error(res, "Failed to save API key", 500);
    }
  }
}

export default ApiKeyController;
