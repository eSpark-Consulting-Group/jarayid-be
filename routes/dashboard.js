import { Router } from "express";

import { DashboardController } from "../controllers/index.js";
import { auth, adminAuth } from "../middleware/index.js";

const router = Router();
const dashboardController = new DashboardController();

/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Get aggregated dashboard data
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get("/", auth, adminAuth, dashboardController.getDashboardData.bind(dashboardController));

export default router;
