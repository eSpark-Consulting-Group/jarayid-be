import { PrismaClient } from "@prisma/client";
import { response, pagination } from "../utils/index.js";
import { cloudinaryService } from "../services/index.js";
import winston from "winston";

// Logger setup
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level.toUpperCase()}] staticPage Controller: ${message} ${
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

const prisma = new PrismaClient();

class StaticPageController {
  constructor() {
    this.prisma = prisma;
  }

  async createStaticPage(req, res) {
    const { title, slug, content } = req.body;

    try {
      const existingPage = await prisma.staticPage.findFirst({
        where: { slug },
      });

      if (existingPage) {
        return response.error(
          res,
          "Static Page with this slug already exists",
          409
        );
      }

      const page = await prisma.staticPage.create({
        data: { title, slug, content },
      });

      return response.success(
        res,
        { staticPage: page },
        "Static Page created successfully",
        201
      );
    } catch (error) {
      logger.error("Create Static Page error:", {
        error: error?.message || error,
      });
      return response.error(
        res,
        "Static Page creation failed",
        500,
        error.message
      );
    }
  }

  async getAllStaticPages(req, res) {
    try {
      const { page = 1, limit = 10, search } = req.query;

      const { skip, take } = pagination.getPaginationParams(req.query, {
        defaultLimit: 10,
        maxLimit: 200,
      });

      const where = {};
      if (search) {
        where.OR = [
          {
            title: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            slug: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            content: {
              contains: search,
              mode: "insensitive",
            },
          },
        ];
      }

      const [staticPages, total] = await Promise.all([
        prisma.staticPage.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: "desc" },
        }),
        prisma.staticPage.count({ where }),
      ]);

      const paginatedResponse = pagination.createPaginatedResponse(
        staticPages,
        req.query,
        total,
        {
          defaultLimit: 10,
          maxLimit: 200,
        }
      );

      return response.success(
        res,
        paginatedResponse,
        "Static pages retrieved successfully"
      );
    } catch (error) {
      logger.error("Get All Static Pages error", {
        error: error?.message || error,
        query: req.query,
      });
      return response.error(
        res,
        "Failed to retrieve static pages",
        500,
        error.message
      );
    }
  }

  async getStaticPageBySlug(req, res) {
    const { slug } = req.params;

    try {
      const page = await prisma.staticPage.findFirst({
        where: { slug },
      });

      if (!page) {
        return response.notFound(res, "Static Page not found");
      }

      return response.success(
        res,
        { staticPage: page },
        "Static Page retrieved successfully"
      );
    } catch (error) {
      logger.error("Get Static Page by Slug error:", {
        error: error?.message || error,
      });
      return response.error(
        res,
        "Failed to retrieve Static Page",
        500,
        error.message
      );
    }
  }

  async getStaticPageById(req, res) {
    const { id } = req.params;

    try {
      const page = await prisma.staticPage.findUnique({
        where: { id },
      });

      if (!page) {
        return response.notFound(res, "Static Page not found");
      }

      return response.success(
        res,
        { staticPage: page },
        "Static Page retrieved successfully"
      );
    } catch (error) {
      logger.error("Get Static Page by ID error:", {
        error: error?.message || error,
      });
      return response.error(
        res,
        "Failed to retrieve Static Page",
        500,
        error.message
      );
    }
  }

  async updateStaticPage(req, res) {
    const { id } = req.params;
    const { title, slug, content } = req.body;

    try {
      const existingPage = await prisma.staticPage.findUnique({
        where: { id },
      });

      if (!existingPage) {
        return response.notFound(res, "Static Page not found");
      }

      if (slug && slug !== existingPage.slug) {
        const slugExists = await prisma.staticPage.findFirst({
          where: { slug },
        });
        if (slugExists) {
          return response.error(
            res,
            "Slug already in use by another Static Page",
            409
          );
        }
      }

      const updatedPage = await prisma.staticPage.update({
        where: { id },
        data: { title, slug, content },
      });

      return response.success(
        res,
        { staticPage: updatedPage },
        "Static Page updated successfully"
      );
    } catch (error) {
      logger.error("Update Static Page error:", {
        error: error?.message || error,
      });
      return response.error(
        res,
        "Static Page update failed",
        500,
        error.message
      );
    }
  }

  async deleteStaticPage(req, res) {
    const { id } = req.params;

    try {
      const existingPage = await prisma.staticPage.findUnique({
        where: { id },
      });

      if (!existingPage) {
        return response.notFound(res, "Static Page not found");
      }

      await prisma.staticPage.delete({ where: { id } });

      return response.success(res, null, "Static Page deleted successfully");
    } catch (error) {
      logger.error("Delete Static Page error:", {
        error: error?.message || error,
      });
      return response.error(
        res,
        "Static Page deletion failed",
        500,
        error.message
      );
    }
  }
}

export default StaticPageController;
