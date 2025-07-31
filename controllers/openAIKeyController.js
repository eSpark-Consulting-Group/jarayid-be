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
        Object.key(meta).length ? JSON.stringify(meta) : ""
      }`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

class OpenAIKeyController {
  constructor() {
    this.prisma = prisma;
  }

  // Create API Key
  async createApiKey(req, res) {
    const { key } = req.body;

    try {
      // Check if any API key already exists
      const existingKey = await prisma.apiKey.findFirst();
      if (existingKey) {
        return response.error(
          res,
          "An API key already exists. Please update the existing key instead.",
          400
        );
      }

      // Create new key
      const newKey = await prisma.apiKey.create({
        data: { key },
      });

      return response.success(res, newKey, "API key added successfully", 201);
    } catch (error) {
      logger.error("Create API key error:", {
        error: error?.message || error,
      });
      return response.error(res, "Failed to add API key", 500);
    }
  }

  // Get an API Key
  async getAPIKey(req, res) {
    try {
      let key = await prisma.apiKey.findMany({
        orderBy: { createdAt: "desc" },
      });

      // If no key found in DB, fall back to env key
      if (!key.length && process.env.OPENAI_API_KEY) {
        key = [{ id: "env", key: process.env.OPENAI_API_KEY }];
      }

      return response.success(res, key, "API key retrieved successfully");
    } catch (error) {
      logger.error("Get API key error:", { error: error?.message || error });
      return response.error(res, "Failed to retrieve API key", 500);
    }
  }

  // Update API Key
  async updateApiKey(req, res) {
    const { id } = req.params;
    const { key } = req.body;

    try {
      const existing = await prisma.apiKey.findUnique({ where: { id } });
      if (!existing) {
        return response.error(res, "API key not found", 404);
      }

      const updated = await prisma.apiKey.update({
        where: { id },
        data: {
          ...(key && { key }),
        },
      });

      return response.success(res, updated, "API key updated successfully");
    } catch (error) {
      logger.error("Update API key error:", {
        error: error?.message || error,
      });
      return response.error(res, "Failed to update API key", 500);
    }
  }

  // Delete API Key
  async deleteApiKey(req, res) {
    const { id } = req.params;

    try {
      const existing = await prisma.apiKey.findUnique({ where: { id } });
      if (!existing) {
        return response.error(res, "API key not found", 404);
      }

      await prisma.apiKey.delete({ where: { id } });

      return response.success(res, null, "API key deleted successfully");
    } catch (error) {
      logger.error("Delete API key error:", {
        error: error?.message || error,
      });
      return response.error(res, "Failed to delete API key", 500);
    }
  }
}

export default OpenAIKeyController;
