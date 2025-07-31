import { Router } from "express";

import schemas from "../schemas/index.js";
import createValidationMiddleware from "../middleware/validate.js";
import { BugController } from "../controllers/index.js";
import { auth, adminAuth } from "../middleware/index.js";

const router = Router();
const bugController = new BugController();
const validation = createValidationMiddleware(schemas);

/**
 * @swagger
 * /bugs:
 *   get:
 *     summary: Get all bugs with pagination
 *     tags: [Bugs]
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
 *         description: Filter bugs by type, category, or description
 *     responses:
 *       200:
 *         description: Bugs retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get(
  "/",
  auth,
  adminAuth,
  validation.bug?.query || ((req, res, next) => next()),
  bugController.getAllBugs
);

/**
 * @swagger
 * /bugs/{id}:
 *   get:
 *     summary: Get bug by ID
 *     tags: [Bugs]
 *     security:
 *        - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Bug ID
 *     responses:
 *       200:
 *         description: Bug retrieved successfully
 *       400:
 *         description: Invalid bug ID
 *       404:
 *         description: Bug not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:id",
  auth,
  adminAuth,
  validation.bug?.params || ((req, res, next) => next()),
  bugController.getBugById
);

export default router;
