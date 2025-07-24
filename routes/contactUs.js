import { Router } from "express";

import schemas from "../schemas/index.js";
import createValidationMiddleware from "../middleware/validate.js";
import { ContactController } from "../controllers/index.js";
import { auth, adminAuth } from "../middleware/index.js";
import optionalAuth from "../middleware/optionalAuth.js";

const router = Router();
const contactController = new ContactController();
const validation = createValidationMiddleware(schemas);
const logHeaders = (req, res, next) => {
  console.log("Headers:", req.headers);
  next();
};
/**
 * @swagger
 * /contact-us:
 *   post:
 *     summary: Submit a contact us form (public)
 *     tags: [Contact Us]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ContactUsRequest'
 *     responses:
 *       201:
 *         description: Contact form submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ContactUsResponse'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
  logHeaders,
  optionalAuth,
  validation.contactUs.create,
  contactController.submitContactForm
);

/**
 * @swagger
 * /contact-us:
 *   get:
 *     summary: Get all contact us submissions (Admin only)
 *     tags: [Contact Us]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Contacts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Contacts retrieved successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     contacts:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ContactUsResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 *       500:
 *         description: Internal server error
 */
router.get("/", auth, adminAuth, contactController.getAllContacts);

/**
 * @swagger
 * /contact-us/{id}:
 *   get:
 *     summary: Get a contact submission by ID (Admin only)
 *     tags: [Contact Us]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *     responses:
 *       200:
 *         description: Contact retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ContactUsResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 *       404:
 *         description: Contact not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:id",
  auth,
  adminAuth,
  validation.contactUs.params,
  contactController.getContactById
);

/**
 * @swagger
 * /contact-us/{id}:
 *   delete:
 *     summary: Delete a contact submission by ID (Admin only)
 *     tags: [Contact Us]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *     responses:
 *       200:
 *         description: Contact deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Contact deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 *       404:
 *         description: Contact not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/:id",
  auth,
  adminAuth,
  validation.contactUs.params,
  contactController.deleteContact
);

export default router;
