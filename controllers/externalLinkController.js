import { response } from "../utils/index.js";
import winston from "winston";
import prisma from "../prisma/index.js";
import { pagination } from "../utils/index.js";

// Logger configuration
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level.toUpperCase()}] ExternalLink Controller: ${message} ${
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

class ExternalLinkController {
  constructor() {
    this.prisma = prisma;
  }

  // Create External Link
  async createExternalLink(req, res) {
    const { toolName, toolRedirectLink, isActive } = req.body;

    try {
      const link = await prisma.externalLink.create({
        data: { toolName, toolRedirectLink, isActive },
      });

      return response.success(
        res,
        link,
        "External link created successfully",
        201
      );
    } catch (error) {
      logger.error("Create external link error:", {
        error: error?.message || error,
      });
      return response.error(res, "Failed to create external link", 500);
    }
  }

  // Get All External Links with pagination + search
  async getAllExternalLinks(req, res) {
    try {
      const { page = 1, limit = 10, search } = req.query;

      const { skip, take } = pagination.getPaginationParams(req.query, {
        defaultLimit: 10,
        maxLimit: 200,
      });

      const where = {};

      // Search filter
      if (search) {
        where.OR = [
          { toolName: { contains: search, mode: "insensitive" } },
          { toolRedirectLink: { contains: search, mode: "insensitive" } },
        ];
      }

      const [links, total] = await Promise.all([
        prisma.externalLink.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: "desc" },
        }),
        prisma.externalLink.count({ where }),
      ]);

      const paginatedResponse = pagination.createPaginatedResponse(
        links,
        req.query,
        total,
        { defaultLimit: 10, maxLimit: 200 }
      );

      return response.success(
        res,
        paginatedResponse,
        "External links retrieved successfully"
      );
    } catch (error) {
      logger.error("Get external links error:", {
        error: error?.message || error,
        query: req.query,
      });
      return response.error(
        res,
        "Failed to retrieve external links",
        500,
        error.message
      );
    }
  }

  // Get External Link by ID
  async getExternalLinkById(req, res) {
    const { id } = req.params;

    try {
      const link = await prisma.externalLink.findUnique({
        where: { id: Number(id) },
      });

      if (!link) {
        return response.error(res, "External link not found", 404);
      }

      return response.success(
        res,
        link,
        "External link retrieved successfully"
      );
    } catch (error) {
      logger.error("Get external link by ID error:", {
        error: error?.message || error,
      });
      return response.error(res, "Failed to retrieve external link", 500);
    }
  }

  // Update External Link
  async updateExternalLink(req, res) {
    const { id } = req.params;
    const { toolName, toolRedirectLink, isActive } = req.body;

    try {
      const existing = await prisma.externalLink.findUnique({
        where: { id: Number(id) },
      });

      if (!existing) {
        return response.error(res, "External link not found", 404);
      }

      const updated = await prisma.externalLink.update({
        where: { id: Number(id) },
        data: { toolName, toolRedirectLink, isActive },
      });

      return response.success(
        res,
        updated,
        "External link updated successfully"
      );
    } catch (error) {
      logger.error("Update external link error:", {
        error: error?.message || error,
      });
      return response.error(res, "Failed to update external link", 500);
    }
  }

  // Delete External Link
  async deleteExternalLink(req, res) {
    const { id } = req.params;

    try {
      const existing = await prisma.externalLink.findUnique({
        where: { id: Number(id) },
      });

      if (!existing) {
        return response.error(res, "External link not found", 404);
      }

      await prisma.externalLink.delete({
        where: { id: Number(id) },
      });

      return response.success(res, null, "External link deleted successfully");
    } catch (error) {
      logger.error("Delete external link error:", {
        error: error?.message || error,
      });
      return response.error(res, "Failed to delete external link", 500);
    }
  }
}

export default ExternalLinkController;
