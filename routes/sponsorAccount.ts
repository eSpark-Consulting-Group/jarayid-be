import { Router } from "express";

import schemas from "../schemas/index.js";
import createValidationMiddleware from "../middleware/validate.js";
import { SponsorAccountController } from "../controllers/index.js";
import { auth, adminAuth } from "../middleware/index.js";

const router = Router();
const sponsorAccountController = new SponsorAccountController();
const validation = createValidationMiddleware(schemas);

/**
 * @swagger
 * /sponsor-accounts:
 *   post:
 *     summary: Create a new sponsor account (Admin only)
 *     tags: [Sponsor Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SponsorAccountCreate'
 *     responses:
 *       201:
 *         description: Sponsor account created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin only
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
  auth,
  adminAuth,
  validation.sponsorAccount.create,
  sponsorAccountController.createSponsorAccount
);

/**
 * @swagger
 * /sponsor-accounts:
 *   get:
 *     summary: Get all sponsor accounts with pagination
 *     tags: [Sponsor Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Filter by sponsor or business name
 *     responses:
 *       200:
 *         description: Sponsor accounts retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get(
  "/",
  auth,
  adminAuth,
  validation.sponsorAccount.query,
  sponsorAccountController.getAllSponsorAccounts
);

/**
 * @swagger
 * /sponsor-accounts/{id}:
 *   get:
 *     summary: Get sponsor account by ID
 *     tags: [Sponsor Accounts]
 *     security:
 *        - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Sponsor account ID
 *     responses:
 *       200:
 *         description: Sponsor account retrieved successfully
 *       400:
 *         description: Invalid sponsor account ID
 *       404:
 *         description: Sponsor account not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:id",
  auth,
  adminAuth,
  validation.sponsorAccount.params,
  sponsorAccountController.getSponsorAccountById
);

/**
 * @swagger
 * /sponsor-accounts/{id}:
 *   put:
 *     summary: Update sponsor account (Admin only)
 *     tags: [Sponsor Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SponsorAccountUpdate'
 *     responses:
 *       200:
 *         description: Sponsor account updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Sponsor account not found
 *       500:
 *         description: Internal server error
 */
router.put(
  "/:id",
  auth,
  adminAuth,
  validation.sponsorAccount.params,
  validation.sponsorAccount.update,
  sponsorAccountController.updateSponsorAccount
);

/**
 * @swagger
 * /sponsor-accounts/{id}:
 *   delete:
 *     summary: Delete sponsor account (Admin only)
 *     tags: [Sponsor Accounts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Sponsor account deleted successfully
 *       400:
 *         description: Invalid sponsor account ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Sponsor account not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/:id",
  auth,
  adminAuth,
  validation.sponsorAccount.params,
  sponsorAccountController.deleteSponsorAccount
);

export default router;
