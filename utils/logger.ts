import winston from "winston";
import prisma from "../prisma/index.js";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message}
      }`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
    new winston.transports.Console({ format: winston.format.simple() }),
  ],
});

/**
 * Save error/bug details into Bug model
 * @param {Object} options
 * @param {string} options.type - Error type (Service, Queue, API, etc.)
 * @param {string} options.category - Category of bug (AI Summary, Queue, etc.)
 * @param {string} options.level - Severity level (error, warn, info)
 * @param {string} options.description - Error description or stack trace
 */
export async function logBug({
  type = "Service",
  category = "General",
  level = "error",
  description
}) {
  try {
    logger.log({ level, message: `[${category}] ${description}` });

    await prisma.bug.create({
      data: {
        type,
        category,
        level,
        description:
          typeof description === "string"
            ? description
            : JSON.stringify(description),

      },
    });
  } catch (err) {
    logger.error("Failed to save bug to DB", { error: err });
  }
}

export default logger;
