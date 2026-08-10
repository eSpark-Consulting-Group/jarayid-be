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
      return `${timestamp} [${level.toUpperCase()}] SponsorAccount Controller: ${message} ${
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

class SponsorAccountController {
  constructor() {
    this.prisma = prisma;
  }

  // Create Sponsor Account
  async createSponsorAccount(req, res) {
    const {
      name,
      businessName,
      website,
      contactEmail,
      category,
      contact,
      status,
      phone,
    } = req.body;

    try {
      const sponsor = await prisma.sponsorAccount.create({
        data: {
          name,
          businessName,
          website,
          contactEmail,
          category,
          contact,
          status,
          phone,
        },
      });

      return response.success(
        res,
        sponsor,
        "Sponsor account created successfully",
        201
      );
    } catch (error) {
      logger.error("Create sponsor account error:", {
        error: error?.message || error,
      });
      return response.error(res, "Failed to create sponsor account", 500);
    }
  }

  // Get All Sponsor Accounts with pagination, filtering, sorting, and meta
  // async getAllSponsorAccounts(req, res) {
  //   try {
  //     const {
  //       page = 1,
  //       limit = 10,
  //       search,
  //       status,
  //       sortBy = "createdAt",
  //       sortOrder = "desc",
  //       dateFrom,
  //       dateTo,
  //     } = req.query;

  //     // Pagination params
  //     const { skip, take } = pagination.getPaginationParams(req.query, {
  //       defaultLimit: 10,
  //       maxLimit: 200,
  //     });

  //     const where = {};

  //     // Search filter
  //     if (search) {
  //       where.OR = [
  //         { name: { contains: search, mode: "insensitive" } },
  //         { company: { contains: search, mode: "insensitive" } },
  //         { email: { contains: search, mode: "insensitive" } },
  //         { website: { contains: search, mode: "insensitive" } },
  //       ];
  //     }

  //     // Status filter (if applicable in schema)
  //     if (status !== undefined) {
  //       if (status === "true" || status === true) {
  //         where.status = true;
  //       } else if (status === "false" || status === false) {
  //         where.status = false;
  //       }
  //     }

  //     // Date range filter for createdAt
  //     if (dateFrom || dateTo) {
  //       where.createdAt = {};
  //       if (dateFrom) {
  //         where.createdAt.gte = new Date(dateFrom);
  //       }
  //       if (dateTo) {
  //         const toDate = new Date(dateTo);
  //         toDate.setHours(23, 59, 59, 999);
  //         where.createdAt.lte = toDate;
  //       }
  //     }

  //     // Sorting config
  //     const validSortFields = ["name", "company", "createdAt", "email"];
  //     const validSortOrders = ["asc", "desc"];
  //     const field = validSortFields.includes(sortBy) ? sortBy : "createdAt";
  //     const order = validSortOrders.includes(sortOrder.toLowerCase())
  //       ? sortOrder.toLowerCase()
  //       : "desc";

  //     const [sponsors, total] = await Promise.all([
  //       prisma.sponsorAccount.findMany({
  //         where,
  //         skip,
  //         take,
  //         orderBy: { [field]: order },
  //       }),
  //       prisma.sponsorAccount.count({ where }),
  //     ]);

  //     // Paginated response
  //     const paginatedResponse = pagination.createPaginatedResponse(
  //       sponsors,
  //       req.query,
  //       total,
  //       { defaultLimit: 10, maxLimit: 200 }
  //     );

  //     // Meta info
  //     if (status !== undefined) {
  //       paginatedResponse.meta.filteredByStatus = status;
  //     }

  //     return response.success(
  //       res,
  //       paginatedResponse,
  //       "Sponsor accounts retrieved successfully"
  //     );
  //   } catch (error) {
  //     logger.error("Get sponsor accounts error:", {
  //       error: error?.message || error,
  //       query: req.query,
  //     });
  //     return response.error(
  //       res,
  //       "Failed to retrieve sponsor accounts",
  //       500,
  //       error.message
  //     );
  //   }
  // }

  async getAllSponsorAccounts(req, res) {
    try {
      const { page = 1, limit = 10, search } = req.query;

      // Pagination params
      const { skip, take } = pagination.getPaginationParams(req.query, {
        defaultLimit: 10,
        maxLimit: 200,
      });

      const where = {};

      // Search filter
      if (search) {
        where.OR = [
          { name: { contains: search, mode: "insensitive" } },
          { businessName: { contains: search, mode: "insensitive" } },
          { contactEmail: { contains: search, mode: "insensitive" } },
        ];
      }

      const [sponsors, total] = await Promise.all([
        prisma.sponsorAccount.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: "desc" },
        }),
        prisma.sponsorAccount.count({ where }),
      ]);

      // Paginated response
      const paginatedResponse = pagination.createPaginatedResponse(
        sponsors,
        req.query,
        total,
        { defaultLimit: 10, maxLimit: 200 }
      );

      return response.success(
        res,
        paginatedResponse,
        "Sponsor accounts retrieved successfully"
      );
    } catch (error) {
      logger.error("Get sponsor accounts error:", {
        error: error?.message || error,
        query: req.query,
      });
      return response.error(
        res,
        "Failed to retrieve sponsor accounts",
        500,
        error.message
      );
    }
  }

  // Get Sponsor by ID
  async getSponsorAccountById(req, res) {
    const { id } = req.params;

    try {
      const sponsor = await prisma.sponsorAccount.findUnique({
        where: { id },
      });

      if (!sponsor) {
        return response.error(res, "Sponsor account not found", 404);
      }

      return response.success(
        res,
        sponsor,
        "Sponsor account retrieved successfully"
      );
    } catch (error) {
      logger.error("Get sponsor account by ID error:", {
        error: error?.message || error,
      });
      return response.error(res, "Failed to retrieve sponsor account", 500);
    }
  }

  // Update Sponsor Account
  async updateSponsorAccount(req, res) {
    const { id } = req.params;
    const {
      name,
      businessName,
      website,
      contactEmail,
      category,
      contact,
      status,
      phone,
    } = req.body;

    try {
      const existing = await prisma.sponsorAccount.findUnique({
        where: { id },
      });

      if (!existing) {
        return response.error(res, "Sponsor account not found", 404);
      }

      const updated = await prisma.sponsorAccount.update({
        where: { id },
        data: {
          name,
          businessName,
          website,
          contactEmail,
          category,
          contact,
          status,
          phone,
        },
      });

      return response.success(
        res,
        updated,
        "Sponsor account updated successfully"
      );
    } catch (error) {
      logger.error("Update sponsor account error:", {
        error: error?.message || error,
      });
      return response.error(res, "Failed to update sponsor account", 500);
    }
  }

  // Delete Sponsor Account
  async deleteSponsorAccount(req, res) {
    const { id } = req.params;

    try {
      const existing = await prisma.sponsorAccount.findUnique({
        where: { id },
      });

      if (!existing) {
        return response.error(res, "Sponsor account not found", 404);
      }

      await prisma.sponsorAccount.delete({ where: { id } });

      return response.success(
        res,
        null,
        "Sponsor account deleted successfully"
      );
    } catch (error) {
      logger.error("Delete sponsor account error:", {
        error: error?.message || error,
      });
      return response.error(res, "Failed to delete sponsor account", 500);
    }
  }
}

export default SponsorAccountController;
