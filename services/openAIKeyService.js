// services/openAIKey.service.js
import { PrismaClient } from "@prisma/client";
import winston from "winston";

const prisma = new PrismaClient();

// Logger setup
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level.toUpperCase()}] OpenAI Key Service: ${message} ${
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

class OpenAIKeyService {
  async getAllKeys() {
    try {
      const keys = await prisma.apiKey.findMany({
        orderBy: { createdAt: "desc" },
      });
      logger.info(`Retrieved ${keys.length} API keys`);
      return keys;
    } catch (error) {
      logger.error("Error retrieving API keys", { error: error.message });
      throw error;
    }
  }

  async getKeyById(id) {
    try {
      const key = await prisma.apiKey.findUnique({ where: { id } });
      if (!key) logger.warn(`API key not found for ID: ${id}`);
      return key;
    } catch (error) {
      logger.error("Error retrieving API key", { error: error.message, id });
      throw error;
    }
  }

  async createKey(data) {
    try {
      const newKey = await prisma.apiKey.create({ data });
      logger.info(`Created new API key: ${newKey.id}`);
      return newKey;
    } catch (error) {
      logger.error("Error creating API key", { error: error.message, data });
      throw error;
    }
  }

  async updateKey(id, data) {
    try {
      const updatedKey = await prisma.apiKey.update({
        where: { id },
        data,
      });
      logger.info(`Updated API key: ${id}`);
      return updatedKey;
    } catch (error) {
      logger.error("Error updating API key", {
        error: error.message,
        id,
        data,
      });
      throw error;
    }
  }

  async deleteKey(id) {
    try {
      const deletedKey = await prisma.apiKey.delete({ where: { id } });
      logger.info(`Deleted API key: ${id}`);
      return deletedKey;
    } catch (error) {
      logger.error("Error deleting API key", { error: error.message, id });
      throw error;
    }
  }

  async validateKey(apiKey) {
    try {
      const key = await prisma.apiKey.findFirst({ where: { key: apiKey } });
      const isValid = !!key;
      logger.info(`API key validation result: ${isValid}`);
      return isValid;
    } catch (error) {
      logger.error("Error validating API key", { error: error.message });
      throw error;
    }
  }
}

export default new OpenAIKeyService();
