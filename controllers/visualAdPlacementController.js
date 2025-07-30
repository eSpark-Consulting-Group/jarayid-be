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
      return `${timestamp} [${level.toUpperCase()}] VisualAdPlacement Controller: ${message} ${
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

class VisualAdPlacementController {
  constructor() {
    this.prisma = prisma;
  }

  // Create Visual Ad Placement
  async createVisualAdPlacement(req, res) {
    const {
      platform,
      pageType,
      positionName,
      adLink,
      isActive = true,
    } = req.body;

    try {
      const adPlacement = await prisma.visualAdPlacement.create({
        data: { platform, pageType, positionName, adLink, isActive },
      });

      return response.success(
        res,
        adPlacement,
        "Visual ad placement created successfully",
        201
      );
    } catch (error) {
      logger.error("Create visual ad placement error:", {
        error: error?.message || error,
      });
      return response.error(res, "Failed to create visual ad placement", 500);
    }
  }

  // Get All Visual Ad Placements with pagination + search
  async getAllVisualAdPlacements(req, res) {
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
          { positionName: { contains: search, mode: "insensitive" } },
          { adLink: { contains: search, mode: "insensitive" } },
        ];
      }

      const [placements, total] = await Promise.all([
        prisma.visualAdPlacement.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: "desc" },
        }),
        prisma.visualAdPlacement.count({ where }),
      ]);

      const paginatedResponse = pagination.createPaginatedResponse(
        placements,
        req.query,
        total,
        { defaultLimit: 10, maxLimit: 200 }
      );

      return response.success(
        res,
        paginatedResponse,
        "Visual ad placements retrieved successfully"
      );
    } catch (error) {
      logger.error("Get visual ad placements error:", {
        error: error?.message || error,
        query: req.query,
      });
      return response.error(
        res,
        "Failed to retrieve visual ad placements",
        500,
        error.message
      );
    }
  }

  // Get Visual Ad Placement by ID
  async getVisualAdPlacementById(req, res) {
    const { id } = req.params;

    try {
      const placement = await prisma.visualAdPlacement.findUnique({
        where: { id: id },
      });

      if (!placement) {
        return response.error(res, "Visual ad placement not found", 404);
      }

      return response.success(
        res,
        placement,
        "Visual ad placement retrieved successfully"
      );
    } catch (error) {
      logger.error("Get visual ad placement by ID error:", {
        error: error?.message || error,
      });
      return response.error(res, "Failed to retrieve visual ad placement", 500);
    }
  }

  // Update Visual Ad Placement
  async updateVisualAdPlacement(req, res) {
    const { id } = req.params;
    const { platform, pageType, positionName, adLink, isActive } = req.body;

    try {
      const existing = await prisma.visualAdPlacement.findUnique({
        where: { id: id },
      });

      if (!existing) {
        return response.error(res, "Visual ad placement not found", 404);
      }

      const updated = await prisma.visualAdPlacement.update({
        where: { id: id },
        data: {
          ...(platform && { platform }),
          ...(pageType && { pageType }),
          ...(positionName && { positionName }),
          ...(adLink && { adLink }),
          ...(typeof isActive === "boolean" && { isActive }),
        },
      });

      return response.success(
        res,
        updated,
        "Visual ad placement updated successfully"
      );
    } catch (error) {
      logger.error("Update visual ad placement error:", {
        error: error?.message || error,
      });
      return response.error(res, "Failed to update visual ad placement", 500);
    }
  }

  // Delete Visual Ad Placement
  async deleteVisualAdPlacement(req, res) {
    const { id } = req.params;

    try {
      const existing = await prisma.visualAdPlacement.findUnique({
        where: { id: id },
      });

      if (!existing) {
        return response.error(res, "Visual ad placement not found", 404);
      }

      await prisma.visualAdPlacement.delete({
        where: { id: id },
      });

      return response.success(
        res,
        null,
        "Visual ad placement deleted successfully"
      );
    } catch (error) {
      logger.error("Delete visual ad placement error:", {
        error: error?.message || error,
      });
      return response.error(res, "Failed to delete visual ad placement", 500);
    }
  }
}

export default VisualAdPlacementController;
