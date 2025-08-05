import prisma from "../prisma/index.js";
import { response } from "../utils/index.js";
import winston from "winston";
import rssSummarizationSchema from "../schemas/rssSummarization.js";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level.toUpperCase()}] rssSummarization Controller: ${message} ${
        Object.keys(meta).length ? JSON.stringify(meta) : ""
      }`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

class RssSummarizationController {
  constructor() {
    this.prisma = prisma;
  }

  // Create or update settings (only 1 record should exist)
  async upsertSettings(req, res) {
    const { error } = rssSummarizationSchema.createOrUpdate.validate(req.body); // Validate request body

    if (error) {
      return response.error(res, error.details[0].message, 400);
    }

    const {
      word_range_15_60,
      word_range_61_300,
      word_range_301_1000,
      word_range_over_1000,
      gpt_model,
      category,
      day_number,
      time_limit,
      threshold,
    } = req.body;

    try {
      const settingsPayload = {
        word_range_15_60,
        word_range_61_300,
        word_range_301_1000,
        word_range_over_1000,
        gpt_model,
        category,
        time_limit,
        day_number,
        threshold,
      };

      const existing = await prisma.rssSummarizationSetting.findFirst();

      let savedSettings;
      if (existing) {
        savedSettings = await prisma.rssSummarizationSetting.update({
          where: { id: existing.id },
          data: { settings: settingsPayload },
        });
      } else {
        savedSettings = await prisma.rssSummarizationSetting.create({
          data: { settings: settingsPayload },
        });
      }

      return response.success(
        res,
        { settings: savedSettings.settings },
        "RSS Summarization settings saved successfully",
        201
      );
    } catch (error) {
      logger.error("Upsert RSS Summarization settings error:", {
        error: error?.message || error,
      });
      return response.error(
        res,
        "Failed to save RSS Summarization settings",
        500,
        error.message
      );
    }
  }

  // Get settings
  async getSettings(req, res) {
    try {
      const settings = await prisma.rssSummarizationSetting.findFirst();

      if (!settings) {
        return response.success(
          res,
          { settings: {} },
          "No RSS Summarization settings found"
        );
      }

      return response.success(
        res,
        { settings: settings.settings },
        "RSS Summarization settings retrieved successfully"
      );
    } catch (error) {
      logger.error("Get RSS Summarization settings error:", {
        error: error?.message || error,
      });
      return response.error(
        res,
        "Failed to retrieve RSS Summarization settings",
        500,
        error.message
      );
    }
  }
}

export default RssSummarizationController;
