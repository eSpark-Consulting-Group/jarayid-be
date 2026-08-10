/**
 * PAGINATION UTILITY USAGE GUIDE
 * 
 * This file demonstrates how to use the pagination utility in any controller.
 * The pagination utility provides consistent pagination across all APIs.
 */

/* 
Example usage in any controller:

import { pagination } from '../utils/index.js';

// Method 1: Complete paginated response (Recommended)
async getAllItems(req, res) {
    try {
        // Get pagination parameters from query
        const { skip, take, page, limit } = pagination.getPaginationParams(req.query, {
            defaultLimit: 10,    // Default items per page
            maxLimit: 100        // Maximum items per page
        });

        // Your where conditions
        const where = {};
        // ... add your filtering logic ...

        // Database queries
        const [items, total] = await Promise.all([
            prisma.yourModel.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                // ... your includes ...
            }),
            prisma.yourModel.count({ where })
        ]);

        // Create paginated response
        const paginatedData = pagination.createPaginatedResponse(
            items, 
            req.query, 
            total, 
            { defaultLimit: 10, maxLimit: 100 }
        );

        return response.success(res, paginatedData, 'Items retrieved successfully');
    } catch (error) {
        return response.error(res, 'Failed to retrieve items', 500);
    }
}

// Method 2: Manual pagination (if you need custom structure)
async getAllItemsManual(req, res) {
    try {
        const { skip, take, page, limit } = pagination.getPaginationParams(req.query);
        
        const [items, total] = await Promise.all([
            prisma.yourModel.findMany({ skip, take }),
            prisma.yourModel.count()
        ]);

        const paginationInfo = pagination.createPaginationResponse(page, limit, total);

        return response.success(res, {
            items,
            pagination: paginationInfo
        }, 'Items retrieved successfully');
    } catch (error) {
        return response.error(res, 'Failed to retrieve items', 500);
    }
}
*/

/**
 * RESPONSE STRUCTURE:
 * 
 * The pagination utility creates consistent response structure:
 * {
 *   "success": true,
 *   "message": "Items retrieved successfully",
 *   "data": {
 *     "items": [...items...],
 *     "pagination": {
 *       "total": 150,
 *       "page": 2,
 *       "limit": 10,
 *       "totalPages": 15,
 *       "hasNextPage": true,
 *       "hasPrevPage": true,
 *       "nextPage": 3,
 *       "prevPage": 1
 *     },
 *     "meta": {
 *       "itemCount": 10,
 *       "totalItems": 150,
 *       "itemsPerPage": 10,
 *       "currentPage": 2
 *     }
 *   }
 * }
 */

/**
 * SWAGGER DOCUMENTATION:
 * 
 * Use these schema references in your route documentation:
 * 
 * Example:
 * responses:
 *   200:
 *     description: Items retrieved successfully
 *     content:
 *       application/json:
 *         schema:
 *           allOf:
 *             - $ref: '#/components/schemas/SuccessResponse'
 *             - type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/YourModelSchema'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationInfo'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 */

// Export empty object to make this a valid module
export default {};
