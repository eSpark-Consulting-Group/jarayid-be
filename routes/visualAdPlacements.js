import { Router } from "express";

import schemas from "../schemas/index.js";
import createValidationMiddleware from "../middleware/validate.js";
import { VisualAdPlacementController } from "../controllers/index.js";
import { /*auth*/ adminAuth } from "../middleware/index.js";

const router = Router();
const visualAdPlacementController = new VisualAdPlacementController();
const validation = createValidationMiddleware(schemas);

/**
 * @swagger
 * /visual-ad-placements:
 *   post:
 *     summary: Create a new visual ad placement (Admin only)
 *     tags: [Visual Ad Placements]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VisualAdPlacementCreate'
 *           example:
 *             platform: "WEB"
 *             pageType: "MAIN_PAGE"
 *             positionName: "Header Banner"
 *             adLink: "https://example.com/ad"
 *             isActive: true
 *     responses:
 *       201:
 *         description: Visual ad placement created successfully
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
  /*auth*/
  /*adminAuth*/
  validation.visualAdPlacement.create,
  visualAdPlacementController.createVisualAdPlacement
);

/**
 * @swagger
 * /visual-ad-placements:
 *   get:
 *     summary: Get all visual ad placements with pagination
 *     tags: [Visual Ad Placements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Filter by position name or ad link
 *     responses:
 *       200:
 *         description: Visual ad placements retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get(
  "/",
  /*auth*/
  /*adminAuth*/
  validation.visualAdPlacement.query,
  visualAdPlacementController.getAllVisualAdPlacements
);

/**
 * @swagger
 * /visual-ad-placements/{id}:
 *   get:
 *     summary: Get visual ad placement by ID
 *     tags: [Visual Ad Placements]
 *     security:
 *        - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Visual ad placement ID
 *     responses:
 *       200:
 *         description: Visual ad placement retrieved successfully
 *       400:
 *         description: Invalid visual ad placement ID
 *       404:
 *         description: Visual ad placement not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:id",
  /*auth*/
  /*adminAuth*/
  validation.visualAdPlacement.params,
  visualAdPlacementController.getVisualAdPlacementById
);

/**
 * @swagger
 * /visual-ad-placements/{id}:
 *   put:
 *     summary: Update visual ad placement (Admin only)
 *     tags: [Visual Ad Placements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VisualAdPlacementUpdate'
 *           example:
 *             platform: "APP"
 *             pageType: "ARTICLE_PAGE"
 *             positionName: "Footer Banner"
 *             adLink: "https://example.com/updated-ad"
 *             isActive: false
 *     responses:
 *       200:
 *         description: Visual ad placement updated successfully
 *       400:
 *         description: Invalid visual ad placement ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Visual ad placement not found
 *       500:
 *         description: Internal server error
 */
router.put(
  "/:id",
  /*auth*/
  /*adminAuth*/
  validation.visualAdPlacement.params,
  validation.visualAdPlacement.update,
  visualAdPlacementController.updateVisualAdPlacement
);

/**
 * @swagger
 * /visual-ad-placements/{id}:
 *   delete:
 *     summary: Delete visual ad placement (Admin only)
 *     tags: [Visual Ad Placements]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Visual ad placement deleted successfully
 *       400:
 *         description: Invalid visual ad placement ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Visual ad placement not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/:id",
  /*auth*/
  /*adminAuth*/
  validation.visualAdPlacement.params,
  visualAdPlacementController.deleteVisualAdPlacement
);

export default router;
