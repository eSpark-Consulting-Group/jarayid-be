import { response } from "../utils/index.js";
import winston from "winston";
import prisma from "../prisma/index.js";
import { dashboardService } from "../services/index.js";

// Logger configuration
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level.toUpperCase()}] Dashboard Controller: ${message} ${
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

class DashboardController {
  constructor() {
    this.prisma = prisma;
    this.dashboardService = dashboardService;
  }

  async getDashboardData(req, res) {
    try {
      const data = await this.dashboardService.getDashboardData();

      return response.success(
        res,
        data,
        "Dashboard data retrieved successfully"
      );
    } catch (error) {
      logger.error("Get dashboard data error:", {
        error: error?.message || error,
      });

      return response.error(
        res,
        "Failed to retrieve dashboard data",
        500,
        error.message
      );
    }
  }
}

export default DashboardController;
