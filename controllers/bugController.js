import { response, pagination } from "../utils/index.js";
import winston from "winston";
import prisma from "../prisma/index.js";

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

  /**
   * GET /bugs - Get all bugs with pagination + search
   */
  async getAllBugs(req, res) {
    try {
      const { skip, take } = pagination.getPaginationParams(req.query, {
        defaultLimit: 10,
        maxLimit: 200,
      });

      const where = {};

      if (req.query.search) {
        where.OR = [
          { type: { contains: req.query.search, mode: "insensitive" } },
          { category: { contains: req.query.search, mode: "insensitive" } },
          { description: { contains: req.query.search, mode: "insensitive" } },
          { level: { contains: req.query.search, mode: "insensitive" } },
        ];
      }

      const [bugs, total] = await Promise.all([
        prisma.bug.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: "desc" },
          include: { events: true },
        }),
        prisma.bug.count({ where }),
      ]);

      // 🧹 Clean bug descriptions
      const cleanedBugs = bugs.map((bug) => {
        let description = bug.description?.trim() || "";

        try {
          const parsed = JSON.parse(description);
          if (typeof parsed === "object") {
            description = JSON.stringify(parsed, null, 2);
          }
        } catch {
          description = description
            .replace(/\(node:.*?\)\s?/g, "")
            .replace(/DeprecationWarning:\s*/g, "Deprecation: ")
            .replace(/Use `node --trace-deprecation.*?\n?/g, "")
            .replace(/\\n/g, "\n")
            .replace(/\s*\n\s*\n/g, "\n")
            .trim();
        }

        return { ...bug, description };
      });

      const paginatedResponse = pagination.createPaginatedResponse(
        cleanedBugs,
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
      logger.error("Get bugs error", {
        error: error?.message || error,
        query: req.query,
      });

      return response.error(res, "Failed to retrieve bugs", 500, error.message);
    }
  }

  /**
   * DELETE /bugs/:id - Delete bug and its events
   */
  async deleteBugById(req, res) {
    const { id } = req.params;

    try {
      const bug = await prisma.bug.findUnique({ where: { id } });
      if (!bug) {
        return response.error(res, "Bug not found", 404);
      }

      await prisma.bugEvent.deleteMany({ where: { bugId: id } });
      await prisma.bug.delete({ where: { id } });

      return response.success(res, null, "Bug deleted successfully");
    } catch (error) {
      logger.error("Delete bug error", { error: error?.message || error });
      return response.error(res, "Failed to delete bug", 500);
    }
  }

  /**
   * DELETE /bugs - Clear all bugs and events
   */
  async clearAllBugs(req, res) {
    try {
      await prisma.bugEvent.deleteMany();
      await prisma.bug.deleteMany();

      return response.success(res, null, "All bugs cleared successfully");
    } catch (error) {
      logger.error("Clear all bugs error", { error: error?.message || error });
      return response.error(res, "Failed to clear bugs", 500);
    }
  }
}

export default BugController;
