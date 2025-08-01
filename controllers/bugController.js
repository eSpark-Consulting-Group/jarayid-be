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
      return `${timestamp} [${level.toUpperCase()}] Bug Controller: ${message} ${
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

class BugController {
  constructor() {
    this.prisma = prisma;
  }

  // Get All Bugs with pagination + search
  async getAllBugs(req, res) {
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
          { type: { contains: search, mode: "insensitive" } },
          { category: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { level: { contains: search, mode: "insensitive" } },
          { time: { contains: search, mode: "insensitive" } },
        ];
      }

      const [bugs, total] = await Promise.all([
        prisma.bug.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: "desc" },
        }),
        prisma.bug.count({ where }),
      ]);

      const paginatedResponse = pagination.createPaginatedResponse(
        bugs,
        req.query,
        total,
        { defaultLimit: 10, maxLimit: 200 }
      );

      return response.success(
        res,
        paginatedResponse,
        "Bugs retrieved successfully"
      );
    } catch (error) {
      logger.error("Get bugs error:", {
        error: error?.message || error,
        query: req.query,
      });
      return response.error(res, "Failed to retrieve bugs", 500, error.message);
    }
  }

  // Get Bug by ID
  async getBugById(req, res) {
    const { id } = req.params;

    try {
      const bug = await prisma.bug.findUnique({
        where: { id: id },
      });

      if (!bug) {
        return response.error(res, "Bug not found", 404);
      }

      return response.success(res, bug, "Bug retrieved successfully");
    } catch (error) {
      logger.error("Get bug by ID error:", {
        error: error?.message || error,
      });
      return response.error(res, "Failed to retrieve bug", 500);
    }
  }
  // Delete Bug by ID
  async deleteBugById(req, res) {
    const { id } = req.params;

    try {
      const bug = await prisma.bug.findUnique({ where: { id } });
      if (!bug) {
        return response.error(res, "Bug not found", 404);
      }

      // First delete all related events
      await prisma.bugEvent.deleteMany({
        where: { bugId: id },
      });

      // Now delete the bug
      await prisma.bug.delete({ where: { id } });

      return response.success(res, null, "Bug deleted successfully");
    } catch (error) {
      logger.error("Delete bug error:", { error: error?.message || error });
      return response.error(res, "Failed to delete bug", 500);
    }
  }

  // Clear all bugs
  async clearAllBugs(req, res) {
    try {
      await prisma.bugEvent.deleteMany();
      await prisma.bug.deleteMany();

      return response.success(res, null, "All bugs cleared successfully");
    } catch (error) {
      logger.error("Clear all bugs error:", { error: error?.message || error });
      return response.error(res, "Failed to clear bugs", 500);
    }
  }
}

export default BugController;
