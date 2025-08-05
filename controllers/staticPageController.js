import prisma from '../prisma/index.js';

import { response, pagination } from "../utils/index.js";
import { cloudinaryService } from "../services/index.js";
import openaiService from '../services/openaiService.js';
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


class StaticPageController {
  constructor() {
    this.prisma = prisma;

    // Bind methods to preserve 'this' context
    this.createStaticPage = this.createStaticPage.bind(this);
    this.getAllStaticPages = this.getAllStaticPages.bind(this);
    this.getStaticPageById = this.getStaticPageById.bind(this);
    this.updateStaticPage = this.updateStaticPage.bind(this);
    this.deleteStaticPage = this.deleteStaticPage.bind(this);
    this.extractTextFromJSON = this.extractTextFromJSON.bind(this);
    this.extractTranslatedField = this.extractTranslatedField.bind(this);
  }

  async createStaticPage(req, res) {
    const { title, slug, content, customFields, autoTranslate } = req.body;

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

      const pageData = {
        title,
        slug,
        content,
        ...(customFields !== undefined && { customFields }),
      };

      // Auto-generate translated content if OpenAI is available
      if (openaiService.isAvailable()) {
        try {
          logger.info(
            `Starting auto-translation for new static page: ${title}`
          );

          // Prepare content for translation
          let translationText = "";
          if (title) {
            translationText += `Title: ${title}\n`;
          }
          if (content) {
            // Handle content based on its type (JSON or string)
            let contentString = "";
            if (typeof content === "object") {
              // If content is JSON, extract text fields for translation
              contentString = this.extractTextFromJSON(content);
            } else {
              contentString = content;
            }
            if (contentString) {
              translationText += `Content: ${contentString}\n`;
            }

          }

          if (translationText.trim()) {
            logger.info(`Translation text prepared for "${title}":`, {
              translationText,
            });
            const translationResult = await openaiService.translateContent(
              translationText,
              "auto"
            );

            logger.info(`Translation result for "${title}":`, {
              success: translationResult.success,
              arabicContentLength: translationResult.arabicContent?.length || 0,
              englishContentLength:
                translationResult.englishContent?.length || 0,
              arabicContent: translationResult.arabicContent,
              englishContent: translationResult.englishContent,
              sourceLanguage: translationResult.sourceLanguage,
            });

            if (translationResult.success) {
              pageData.translatedContent = [
                {
                  language: 'arabic',
                  title: this.extractTranslatedField(
                    translationResult.arabicContent,
                    "Title"
                  ),
                  content: this.extractTranslatedField(
                    translationResult.arabicContent,
                    "Content"
                  ),

                  translatedAt: translationResult.translatedAt,
                  sourceLanguage: translationResult.sourceLanguage,
                },
                {
                  language: 'english',
                  title: this.extractTranslatedField(
                    translationResult.englishContent,
                    "Title"
                  ),
                  content: this.extractTranslatedField(
                    translationResult.englishContent,
                    "Content"
                  ),
                  translatedAt: translationResult.translatedAt,
                  sourceLanguage: translationResult.sourceLanguage,
                }
              ];

              logger.info(
                `✅ Successfully translated new static page content: ${title}`
              );
            } else {
              logger.warn(
                `⚠️ Translation failed for new static page: ${title}`,
                { error: translationResult.error }
              );
            }
          }
        } catch (translationError) {
          logger.error("Translation error during static page creation:", {
            error: translationError?.message || translationError,
            pageTitle: title,
          });
          // Continue with creation even if translation fails
        }
      }

      const page = await prisma.staticPage.create({
        data: pageData,
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

  // async getAllStaticPages(req, res) {
  //   try {
  //     const { page = 1, limit = 10, search } = req.query;

  //     const { skip, take } = pagination.getPaginationParams(req.query, {
  //       defaultLimit: 10,
  //       maxLimit: 200,
  //     });

  //     let staticPages, total;

  //     if (search) {
  //       // For JSON content search, we need to use raw queries
  //       const searchTerm = `%${search}%`;

  //       // Raw query to search in JSON content as well
  //       const rawQuery = `
  //         SELECT * FROM "StaticPage"
  //         WHERE
  //           LOWER(title) LIKE LOWER($1) OR
  //           LOWER(slug) LIKE LOWER($2) OR
  //           LOWER(content::text) LIKE LOWER($3)
  //         ORDER BY "createdAt" DESC
  //         LIMIT $4 OFFSET $5
  //       `;

  //       const countQuery = `
  //         SELECT COUNT(*) as count FROM "StaticPage"
  //         WHERE
  //           LOWER(title) LIKE LOWER($1) OR
  //           LOWER(slug) LIKE LOWER($2) OR
  //           LOWER(content::text) LIKE LOWER($3)
  //       `;

  //       // Execute both queries
  //       const [pages, countResult] = await Promise.all([
  //         prisma.$queryRawUnsafe(rawQuery, searchTerm, searchTerm, searchTerm, take, skip),
  //         prisma.$queryRawUnsafe(countQuery, searchTerm, searchTerm, searchTerm)
  //       ]);

  //       staticPages = pages;
  //       total = parseInt(countResult[0].count);
  //     } else {
  //       // No search, use regular Prisma query
  //       const where = {};

  //       [staticPages, total] = await Promise.all([
  //         prisma.staticPage.findMany({
  //           where,
  //           skip,
  //           take,
  //           orderBy: { createdAt: "desc" },
  //         }),
  //         prisma.staticPage.count({ where }),
  //       ]);
  //     }

  //     const paginatedResponse = pagination.createPaginatedResponse(
  //       staticPages,
  //       req.query,
  //       total,
  //       {
  //         defaultLimit: 10,
  //         maxLimit: 200,
  //       }
  //     );

  //     return response.success(
  //       res,
  //       paginatedResponse,
  //       "Static pages retrieved successfully"
  //     );
  //   } catch (error) {
  //     logger.error("Get All Static Pages error", {
  //       error: error?.message || error,
  //       query: req.query,
  //     });
  //     return response.error(
  //       res,
  //       "Failed to retrieve static pages",
  //       500,
  //       error.message
  //     );
  //   }
  // }

  async getAllStaticPages(req, res) {
    try {
      const { page = 1, limit = 10, search } = req.query;

      const { skip, take } = pagination.getPaginationParams(req.query, {
        defaultLimit: 10,
        maxLimit: 200,
      });

      let staticPages, total;

      if (search) {
        const searchTerm = `%${search}%`;

        const rawQuery = `
        SELECT * FROM "StaticPage" 
        WHERE 
          LOWER(title) LIKE LOWER($1) OR 
          LOWER(slug) LIKE LOWER($2) OR
          LOWER(content::text) LIKE LOWER($3)
        ORDER BY "createdAt" DESC
        LIMIT $4 OFFSET $5
      `;

        const countQuery = `
        SELECT COUNT(*) as count FROM "StaticPage" 
        WHERE 
          LOWER(title) LIKE LOWER($1) OR 
          LOWER(slug) LIKE LOWER($2) OR
          LOWER(content::text) LIKE LOWER($3)
      `;

        const [pages, countResult] = await Promise.all([
          prisma.$queryRawUnsafe(
            rawQuery,
            searchTerm,
            searchTerm,
            searchTerm,
            take,
            skip
          ),
          prisma.$queryRawUnsafe(
            countQuery,
            searchTerm,
            searchTerm,
            searchTerm
          ),
        ]);

        staticPages = pages;
        total = parseInt(countResult[0].count);
      } else {
        const where = {};

        [staticPages, total] = await Promise.all([
          prisma.staticPage.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: "desc" },
          }),
          prisma.staticPage.count({ where }),
        ]);
      }

  

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
    const { title, slug, content, customFields, autoTranslate } = req.body;

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

      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (slug !== undefined) updateData.slug = slug;
      if (content !== undefined) updateData.content = content;
      if (customFields !== undefined) updateData.customFields = customFields;

      // Handle auto-translation if OpenAI is available
      if (openaiService.isAvailable()) {
        try {
          logger.info(
            `Starting auto-translation for static page: ${existingPage.title}`
          );

          const contentToTranslate = {
            title: updateData.title || existingPage.title,
            content: updateData.content || existingPage.content,
          };

          // Prepare content for translation
          let translationText = "";
          if (contentToTranslate.title) {
            translationText += `Title: ${contentToTranslate.title}\n`;
          }
          if (contentToTranslate.content) {
            // Handle content based on its type (JSON or string)
            let contentString = "";
            if (typeof contentToTranslate.content === "object") {
              // If content is JSON, extract text fields for translation
              contentString = this.extractTextFromJSON(
                contentToTranslate.content
              );
            } else {
              contentString = contentToTranslate.content;
            }
            if (contentString) {
              translationText += `Content: ${contentString}\n`;
            }
          }

          if (translationText.trim()) {
            // Translate the content to Arabic and English
            logger.info(`📝 Content to translate: ${translationText}`);
            const translationResult = await openaiService.translateContent(
              translationText,
              "auto"
            );

            logger.info(`🔍 Translation result received:`, {
              success: translationResult.success,
              arabicContentLength: translationResult.arabicContent?.length || 0,
              englishContentLength:
                translationResult.englishContent?.length || 0,
              arabicContent: translationResult.arabicContent,
              englishContent: translationResult.englishContent,
            });

            if (translationResult.success) {
              const existingTranslatedContent =
                existingPage.translatedContent || {};

              // Extract fields with detailed logging
              const arabicTitle = this.extractTranslatedField(
                translationResult.arabicContent,
                "Title"
              );
              const arabicContent = this.extractTranslatedField(
                translationResult.arabicContent,
                "Content"
              );
              const englishTitle = this.extractTranslatedField(
                translationResult.englishContent,
                "Title"
              );
              const englishContent = this.extractTranslatedField(
                translationResult.englishContent,
                "Content"
              );

              logger.info(`🔎 Extracted fields:`, {
                arabicTitle,
                arabicContent,
                englishTitle,
                englishContent,
              });

              updateData.translatedContent = [
                {
                  language: 'arabic',
                  title: arabicTitle,
                  content: arabicContent,
                  translatedAt: translationResult.translatedAt,
                  sourceLanguage: translationResult.sourceLanguage,
                },
                {
                  language: 'english',
                  title: englishTitle,
                  content: englishContent,
                  translatedAt: translationResult.translatedAt,
                  sourceLanguage: translationResult.sourceLanguage,
                }
              ];

              logger.info(
                `✅ Successfully translated static page content for: ${existingPage.title}`
              );
            } else {
              logger.warn(
                `⚠️ Translation failed for static page: ${existingPage.title}`,
                { error: translationResult.error }
              );
            }
          }
        } catch (translationError) {
          logger.error("Translation error during static page update:", {
            error: translationError?.message || translationError,
            pageId: id,
          });
          // Continue with update even if translation fails
        }
      }

      const updatedPage = await prisma.staticPage.update({
        where: { id },
        data: updateData,
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

  /**
   * Helper method to extract text from JSON content
   */
  extractTextFromJSON(jsonContent) {
    if (!jsonContent || typeof jsonContent !== "object") return "";

    let textContent = "";

    // Special handling for FAQ structure
    if (jsonContent.faq && Array.isArray(jsonContent.faq)) {
      jsonContent.faq.forEach((faqItem, index) => {
        if (faqItem.question) {
          textContent += `FAQ Question ${index + 1}: ${faqItem.question}\n`;
        }
        if (faqItem.answer) {
          textContent += `FAQ Answer ${index + 1}: ${faqItem.answer}\n`;
        }
      });
      return textContent.trim();
    }

    // General recursive extraction for other JSON structures
    const extractTextRecursively = (obj) => {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          if (typeof value === "string") {
            textContent += `${value} `;
          } else if (Array.isArray(value)) {
            // Handle arrays
            value.forEach(item => {
              if (typeof item === "string") {
                textContent += `${item} `;
              } else if (typeof item === "object" && item !== null) {
                extractTextRecursively(item);
              }
            });
          } else if (typeof value === "object" && value !== null) {
            extractTextRecursively(value);
          }
        }
      }
    };

    extractTextRecursively(jsonContent);
    return textContent.trim();
  }

  /**
   * Helper method to extract translated field from OpenAI response
   */
  extractTranslatedField(translatedText, fieldName) {
    if (!translatedText) {
      logger.warn(`No translated text provided for field: ${fieldName}`);
      return null;
    }

    // Log the translated text for debugging (truncated for readability)
    const truncatedText =
      translatedText.length > 500
        ? translatedText.substring(0, 500) + "..."
        : translatedText;
    logger.info(`Extracting field "${fieldName}" from translated text:`, {
      truncatedText,
    });

    // Special handling for FAQ content
    if (fieldName === "Content" && translatedText.includes("FAQ Question")) {
      // Extract FAQ structure from translated text
      const faqPattern = /FAQ Question \d+:\s*(.+?)\s*FAQ Answer \d+:\s*(.+?)(?=FAQ Question|\n|$)/gi;
      const matches = [...translatedText.matchAll(faqPattern)];
      
      if (matches.length > 0) {
        let faqContent = "";
        matches.forEach((match, index) => {
          const question = match[1]?.trim();
          const answer = match[2]?.trim();
          if (question && answer) {
            faqContent += `Q${index + 1}: ${question}\nA${index + 1}: ${answer}\n\n`;
          }
        });
        
        if (faqContent) {
          logger.info(`Successfully extracted FAQ content: ${faqContent.substring(0, 200)}...`);
          return faqContent.trim();
        }
      }
    }

    // Try multiple regex patterns to match different response formats
    const patterns = [
      // Standard format: "FieldName: value"
      new RegExp(`${fieldName}:\\s*(.+?)(?=\\n|$)`, "i"),
      // Quoted format: "FieldName: "value""
      new RegExp(`${fieldName}:\\s*"([^"]+)"`, "i"),
      // Single quoted format: "FieldName: 'value'"
      new RegExp(`${fieldName}:\\s*'([^']+)'`, "i"),
      // With extra text: "FieldName (Arabic): value"
      new RegExp(`${fieldName}[^:]*:\\s*(.+?)(?=\\n|$)`, "i"),
      // Arabic format variations
      new RegExp(`${fieldName}.*?:\\s*(.+?)(?=\\n|$)`, "i"),
      // Line-by-line search (more flexible)
      new RegExp(`^.*${fieldName}.*?:\\s*(.+?)$`, "mi"),
      // Handle potential Unicode issues with Arabic
      new RegExp(
        `${fieldName}[\\s\\u200B-\\u200D\\uFEFF]*:\\s*(.+?)(?=\\n|$)`,
        "i"
      ),
    ];

    for (let i = 0; i < patterns.length; i++) {
      const regex = patterns[i];
      const match = translatedText.match(regex);
      if (match && match[1] && match[1].trim()) {
        const extractedValue = match[1].trim().replace(/^["']|["']$/g, ""); // Remove quotes
        if (
          extractedValue &&
          extractedValue !== "null" &&
          extractedValue !== "undefined"
        ) {
          logger.info(
            `Successfully extracted "${fieldName}" using pattern ${
              i + 1
            }: ${extractedValue}`
          );
          return extractedValue;
        }
      }
    }

    // If no pattern worked, try to find any line containing the field name
    const lines = translatedText.split("\n");
    for (const line of lines) {
      if (
        line.toLowerCase().includes(fieldName.toLowerCase()) &&
        line.includes(":")
      ) {
        const parts = line.split(":");
        if (parts.length >= 2) {
          const value = parts
            .slice(1)
            .join(":")
            .trim()
            .replace(/^["']|["']$/g, "");
          if (value && value !== "null" && value !== "undefined") {
            logger.info(
              `Successfully extracted "${fieldName}" from line: ${value}`
            );
            return value;
          }
        }
      }
    }

    logger.warn(
      `Could not extract field "${fieldName}" from translated text. Available content: ${truncatedText}`
    );
    return null;
  }
}

const staticPageController = new StaticPageController();

export default staticPageController;
