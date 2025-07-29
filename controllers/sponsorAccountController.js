import { response } from "../utils/index.js";
import winston from "winston";
import prisma from "../prisma/index.js";

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

  // Get all Sponsor Accounts
  async getAllSponsorAccounts(req, res) {
    try {
      const sponsors = await prisma.sponsorAccount.findMany({
        orderBy: { createdAt: "desc" },
      });

      return response.success(
        res,
        sponsors,
        "Sponsor accounts retrieved successfully"
      );
    } catch (error) {
      logger.error("Get sponsor accounts error:", {
        error: error?.message || error,
      });
      return response.error(res, "Failed to retrieve sponsor accounts", 500);
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
