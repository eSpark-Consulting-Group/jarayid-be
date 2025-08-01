import { response } from "../utils/index.js";
import winston from "winston";
import prisma from "../prisma/index.js";

// Logger configuration
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level.toUpperCase()}] BugWebhookController: ${message} ${
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

class BugWebhookController {
  constructor() {
    this.prisma = prisma;
  }

  /**
   * Handle incoming Sentry webhook
   * Saves bug and event details into database
   */
  async handleSentryWebhook(req, res) {
    try {
      const payload = req.body;

      // Log incoming webhook payload
      logger.info("Received Sentry webhook payload", { payload });

      // Validate payload structure
      if (!payload?.event) {
        logger.error("Invalid Sentry webhook payload", { payload });
        return response.error(res, "Invalid webhook payload", 400);
      }

      // Extract bug metadata with fallbacks
      const type = payload?.event?.type || "error";
      const category = payload?.event?.platform || "unknown";
      const description =
        payload?.event?.message || payload?.event?.title || "No description";
      const level = payload?.event?.level || "error";

      // Prevent duplicate bugs
      let bug = await prisma.bug.findFirst({
        where: { description, type, level },
      });

      if (bug) {
        logger.info("Duplicate bug found, recording new event", {
          bugId: bug.id,
        });
      } else {
        // Create new bug record
        bug = await prisma.bug.create({
          data: { type, category, description, level },
        });
        logger.info("New bug stored successfully", { bugId: bug.id });
      }

      // Always create event for tracking occurrences
      await prisma.bugEvent.create({
        data: { bugId: bug.id, message: description },
      });

      return response.success(
        res,
        bug,
        bug
          ? "Bug event recorded successfully"
          : "New bug recorded successfully",
        bug ? 200 : 201
      );
    } catch (error) {
      logger.error("Error handling Sentry webhook", {
        error: error?.message || error,
      });
      return response.error(res, "Failed to process Sentry webhook", 500);
    }
  }
}

export default BugWebhookController;
