/**
 * Pagination utility for handling pagination logic across controllers
 */

/**
 * Calculate pagination parameters
 * @param {number|string} page - Current page number
 * @param {number|string} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} Pagination object with calculated values
 */
export const calculatePagination = (page = 1, limit = 10, total = 0) => {
    const currentPage = parseInt(page) || 1;
    const itemsPerPage = parseInt(limit) || 10;
    const totalItems = parseInt(total) || 0;
    
    // Calculate skip for database query
    const skip = (currentPage - 1) * itemsPerPage;
    
    // Calculate total pages
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    
    // Calculate if there are next/previous pages
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;
    
    return {
        page: currentPage,
        limit: itemsPerPage,
        skip,
        total: totalItems,
        totalPages,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? currentPage + 1 : null,
        prevPage: hasPrevPage ? currentPage - 1 : null
    };
};

/**
 * Create pagination response object for API responses
 * @param {number|string} page - Current page number
 * @param {number|string} limit - Items per page
 * @param {number} total - Total number of items
 * @returns {Object} Pagination object for API response
 */
export const createPaginationResponse = (page = 1, limit = 10, total = 0) => {
    const pagination = calculatePagination(page, limit, total);
    
    return {
        total: pagination.total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: pagination.totalPages,
        hasNextPage: pagination.hasNextPage,
        hasPrevPage: pagination.hasPrevPage,
        nextPage: pagination.nextPage,
        prevPage: pagination.prevPage
    };
};

/**
 * Get pagination parameters for database queries
 * @param {Object} query - Request query object
 * @param {Object} options - Options for pagination
 * @param {number} options.defaultLimit - Default limit if not provided
 * @param {number} options.maxLimit - Maximum allowed limit
 * @returns {Object} Object containing skip, take, page, and limit
 */
export const getPaginationParams = (query = {}, options = {}) => {
    const { defaultLimit = 10, maxLimit = 100 } = options;
    
    let page = parseInt(query.page) || 1;
    let limit = parseInt(query.limit) || defaultLimit;
    
    // Ensure page is at least 1
    if (page < 1) page = 1;
    
    // Ensure limit is within bounds
    if (limit < 1) limit = defaultLimit;
    if (limit > maxLimit) limit = maxLimit;
    
    const skip = (page - 1) * limit;
    
    return {
        skip,
        take: limit,
        page,
        limit
    };
};

/**
 * Create paginated response with data
 * @param {Array} data - Array of data items
 * @param {Object} query - Request query object
 * @param {number} total - Total number of items
 * @param {Object} options - Options for pagination
 * @returns {Object} Complete paginated response
 */
export const createPaginatedResponse = (data, query, total, options = {}) => {
    const { page, limit } = getPaginationParams(query, options);
    const pagination = createPaginationResponse(page, limit, total);
    
    return {
        items:data,
        pagination,
        meta: {
            itemCount: data.length,
            totalItems: total,
            itemsPerPage: limit,
            currentPage: page
        }
    };
};

export default {
    calculatePagination,
    createPaginationResponse,
    getPaginationParams,
    createPaginatedResponse
};
