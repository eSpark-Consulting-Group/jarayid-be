import { PrismaClient } from "@prisma/client";
import winston from "winston";

import { response, pagination } from "../utils/index.js";

// Logger configuration
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level.toUpperCase()}] contactController: ${message} ${
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

class ContactController {
  constructor() {
    this.prisma = prisma;
  }

  // async submitContactForm(req, res) {
  //   const {
  //     name,
  //     business_name,
  //     contact_number,
  //     contact_email,
  //     message,
  //     country,
  //   } = req.body;

  //   try {
  //     const contactData = {
  //       name,
  //       business_name,
  //       contact_number,
  //       contact_email,
  //       message,
  //       country,
  //     };

  //     if (req.user?.id) {
  //       contactData.userId = req.user.id;
  //     }

  //     const contact = await prisma.contact.create({
  //       data: contactData,
  //     });

  //     logger.info("Contact form submitted", { contactId: contact.id });

  //     return response.success(
  //       res,
  //       {
  //         contact,
  //         submitted_by: req.user?.id ? "authenticated_user" : "anonymous_user",
  //       },
  //       "Contact form submitted successfully",
  //       201
  //     );
  //   } catch (error) {
  //     logger.error("Submit Contact Form error", {
  //       error: error?.message || error,
  //     });
  //     return response.error(
  //       res,
  //       "Failed to submit contact form",
  //       500,
  //       error.message
  //     );
  //   }
  // }
  async submitContactForm(req, res) {
    const {
      name,
      business_name,
      contact_number,
      contact_email,
      message,
      country,
    } = req.body;

    try {
      const contact = await prisma.contact.create({
        data: {
          name,
          business_name,
          contact_number,
          contact_email,
          message,
          country,
          userId: req.user?.id || null, // ✅ properly associate logged-in user or fallback to null
        },
      });

      logger.info("Contact form submitted", { contactId: contact.id });

      return response.success(
        res,
        {
          contact,
          submitted_by: contact.userId
            ? "authenticated_user"
            : "anonymous_user", // ✅ cleaner check
        },
        "Contact form submitted successfully",
        201
      );
    } catch (error) {
      logger.error("Submit Contact Form error", {
        error: error?.message || error,
      });

      return response.error(
        res,
        "Failed to submit contact form",
        500,
        error?.message
      );
    }
  }

  async updateContact(req, res) {
    const { id } = req.params;
    const {
      name,
      business_name,
      contact_number,
      contact_email,
      message,
      country,
    } = req.body;

    try {
      const updatedContact = await prisma.contact.update({
        where: { id },
        data: {
          name,
          business_name,
          contact_number,
          contact_email,
          message,
          country,
        },
      });

      logger.info("Contact updated", { contactId: id });

      return response.success(
        res,
        { contact: updatedContact },
        "Contact updated successfully"
      );
    } catch (error) {
      logger.error("Update Contact error", {
        error: error?.message || error,
      });
      return response.error(
        res,
        "Failed to update contact",
        500,
        error.message
      );
    }
  }

  async getAllContacts(req, res) {
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
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            email: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            message: {
              contains: search,
              mode: "insensitive",
            },
          },
        ];
      }

      const [contacts, total] = await Promise.all([
        prisma.contact.findMany({
          where,
          skip,
          take,
          orderBy: { createdAt: "desc" },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        }),
        prisma.contact.count({ where }),
      ]);

      const formattedContacts = contacts.map((contact) => ({
        ...contact,
        submitted_by: contact.user
          ? contact.user.email || contact.user.name || "Member"
          : "Not a member",
      }));

      const paginatedResponse = pagination.createPaginatedResponse(
        formattedContacts,
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
        "Contacts retrieved successfully"
      );
    } catch (error) {
      logger.error("Get All Contacts error", {
        error: error?.message || error,
        query: req.query,
      });
      return response.error(
        res,
        "Failed to retrieve contacts",
        500,
        error.message
      );
    }
  }

  async getContactById(req, res) {
    const { id } = req.params;

    try {
      const contact = await prisma.contact.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      if (!contact) {
        return response.notFound(res, "Contact not found");
      }

      const formattedContact = {
        ...contact,
        submitted_by: contact.user
          ? contact.user.email || contact.user.name || "Member"
          : "Not a member",
      };

      return response.success(
        res,
        { contact: formattedContact },
        "Contact retrieved successfully"
      );
    } catch (error) {
      logger.error("Get Contact By ID error", {
        error: error?.message || error,
      });
      return response.error(
        res,
        "Failed to retrieve contact",
        500,
        error.message
      );
    }
  }

  async deleteContact(req, res) {
    const { id } = req.params;

    try {
      const existingContact = await prisma.contact.findUnique({
        where: { id },
      });

      if (!existingContact) {
        return response.notFound(res, "Contact not found");
      }

      await prisma.contact.delete({
        where: { id },
      });

      logger.info("Contact deleted", { contactId: id });

      return response.success(res, null, "Contact deleted successfully");
    } catch (error) {
      logger.error("Delete Contact error", { error: error?.message || error });
      return response.error(
        res,
        "Failed to delete contact",
        500,
        error.message
      );
    }
  }
}

export default ContactController;
