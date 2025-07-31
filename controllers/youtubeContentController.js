
import winston from 'winston';
import { response, pagination, youtubeUtils } from '../utils/index.js';

import prisma from '../prisma/index.js';
// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] YouTube: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});


class YouTubeContentController {
      constructor() {
            this.prisma = prisma;
        }
    /**
     * Create new YouTube content
     * POST /api/youtube-content
     */
    async create(req, res) {
        try {
            const userId = req.user.id;
            const { title, youtubeUrl, contentType, categoryId, description, thumbnailUrl, deviceType, duration, isEnabled } = req.body;

            logger.info(`📺 Creating new YouTube content: ${title} (${contentType || 'auto-detect'})`);

            // Validate YouTube URL and extract info
            if (!youtubeUtils.isValidYouTubeUrl(youtubeUrl)) {
                return response.error(res, 'Invalid YouTube URL provided', 400, 'INVALID_YOUTUBE_URL');
            }

            // Extract YouTube info (video ID, content type, thumbnail)
            const youtubeInfo = youtubeUtils.extractYouTubeInfo(youtubeUrl);
            if (!youtubeInfo) {
                return response.error(res, 'Could not extract information from YouTube URL', 400, 'YOUTUBE_INFO_EXTRACTION_FAILED');
            }

            // Auto-detect content type if not provided, or validate if provided
            let finalContentType = contentType;
            if (!contentType) {
                finalContentType = youtubeInfo.contentType;
                logger.info(`🔍 Auto-detected content type: ${finalContentType} from URL`);
            } else if (contentType !== youtubeInfo.contentType) {
                logger.warn(`⚠️ Content type mismatch: provided=${contentType}, detected=${youtubeInfo.contentType}`);
                // Use the provided contentType but log the discrepancy
            }

            // Auto-generate thumbnail if not provided
            let finalThumbnailUrl = thumbnailUrl;
            if (!thumbnailUrl) {
                finalThumbnailUrl = youtubeInfo.thumbnailUrl;
                logger.info(`🖼️ Auto-generated thumbnail URL: ${finalThumbnailUrl}`);
            }

            // Check if category exists
            const category = await prisma.category.findUnique({
                where: { id: categoryId },
                select: { id: true, name: true }
            });

            if (!category) {
                return response.error(res, 'Category not found', 404, 'CATEGORY_NOT_FOUND');
            }

            // Check for duplicate YouTube URL
            const existingContent = await prisma.youTubeContent.findFirst({
                where: { youtubeUrl }
            });

            if (existingContent) {
                return response.error(res, 'YouTube URL already exists', 409, 'DUPLICATE_URL');
            }

            // Create YouTube content with enhanced data
            const youtubeContent = await prisma.youTubeContent.create({
                data: {
                    title,
                    youtubeUrl,
                    contentType: finalContentType,
                    categoryId,
                    description: description || null,
                    thumbnailUrl: finalThumbnailUrl,
                    deviceType: deviceType || null,
                    duration: duration || null,
                    isEnabled: isEnabled ?? true,
                    createdById: userId,
                    // Store additional YouTube info for future use
                    videoId: youtubeInfo.videoId
                },
                include: {
                    category: {
                        select: { id: true, name: true, type: true }
                    },
                    createdBy: {
                        select: { id: true, name: true, email: true }
                    }
                }
            });

            // Add thumbnail alternatives to response
            const responseData = {
                ...youtubeContent,
                thumbnailAlternatives: youtubeInfo.thumbnails,
                youtubeInfo: {
                    videoId: youtubeInfo.videoId,
                    isShorts: youtubeInfo.isShorts,
                    detectedContentType: youtubeInfo.contentType
                }
            };

            logger.info(`✅ YouTube content created: ${youtubeContent.id} (${finalContentType})`);

            return response.success(res, responseData, 'YouTube content created successfully', 201);

        } catch (error) {
            logger.error('❌ Error creating YouTube content:', { 
                error: error.message,
                stack: error.stack,
                userId: req.user?.id
            });

            return response.error(res, 'Failed to create YouTube content', 500, error.message);
        }
    }

    /**
     * Get all YouTube content with filtering and pagination
     * GET /api/youtube-content
     */
    async getAll(req, res) {
        try {
            const { 
                page, 
                limit, 
                contentType, 
                categoryId, 
                isEnabled, 
                deviceType, 
                search, 
                sortBy, 
                sortOrder 
            } = req.query;

            logger.info(`📋 Fetching YouTube content list - Page: ${page}, Limit: ${limit}`);

            // Build where condition
            const where = {};
            
            if (contentType) where.contentType = contentType;
            if (categoryId) where.categoryId = categoryId;
            if (typeof isEnabled === 'boolean') where.isEnabled = isEnabled;
            if (deviceType) where.deviceType = deviceType;
            
            if (search) {
                where.OR = [
                    { title: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } }
                ];
            }

            // Build orderBy
            const orderBy = {};
            orderBy[sortBy] = sortOrder;

            // Get total count for pagination
            const totalItems = await prisma.youTubeContent.count({ where });

            // Get paginated data
            const { skip, take } = pagination.getPaginationParams({ page, limit });

            const youtubeContents = await prisma.youTubeContent.findMany({
                where,
                skip,
                take,
                orderBy,
                include: {
                    category: {
                        select: { id: true, name: true, type: true }
                    },
                    createdBy: {
                        select: { id: true, name: true, email: true }
                    }
                }
            });

            // Enhance response with thumbnail alternatives for each content
            const enhancedContents = youtubeContents.map(content => {
                const youtubeInfo = youtubeUtils.extractYouTubeInfo(content.youtubeUrl);
                return {
                    ...content,
                    thumbnailAlternatives: youtubeInfo ? youtubeInfo.thumbnails : null,
                    youtubeInfo: youtubeInfo ? {
                        videoId: youtubeInfo.videoId,
                        isShorts: youtubeInfo.isShorts,
                        detectedContentType: youtubeInfo.contentType
                    } : null
                };
            });

            // Create paginated response
            const paginatedData = pagination.createPaginatedResponse(
                enhancedContents,
                { page, limit },
                totalItems
            );

            logger.info(`✅ Found ${youtubeContents.length} YouTube contents out of ${totalItems} total`);

            return response.success(res, paginatedData, 'YouTube contents retrieved successfully');

        } catch (error) {
            logger.error('❌ Error fetching YouTube contents:', { 
                error: error.message,
                stack: error.stack
            });

            return response.error(res, 'Failed to fetch YouTube contents', 500, error.message);
        }
    }

    /**
     * Get single YouTube content by ID
     * GET /api/youtube-content/:id
     */
    async getById(req, res) {
        try {
            const { id } = req.params;

            logger.info(`🔍 Fetching YouTube content: ${id}`);

            const youtubeContent = await prisma.youTubeContent.findUnique({
                where: { id },
                include: {
                    category: {
                        select: { id: true, name: true, type: true }
                    },
                    createdBy: {
                        select: { id: true, name: true, email: true }
                    }
                }
            });

            if (!youtubeContent) {
                return response.error(res, 'YouTube content not found', 404, 'CONTENT_NOT_FOUND');
            }

            // Increment view count
            await prisma.youTubeContent.update({
                where: { id },
                data: { viewCount: { increment: 1 } }
            });

            // Enhance response with thumbnail alternatives
            const youtubeInfo = youtubeUtils.extractYouTubeInfo(youtubeContent.youtubeUrl);
            const enhancedContent = {
                ...youtubeContent,
                thumbnailAlternatives: youtubeInfo ? youtubeInfo.thumbnails : null,
                youtubeInfo: youtubeInfo ? {
                    videoId: youtubeInfo.videoId,
                    isShorts: youtubeInfo.isShorts,
                    detectedContentType: youtubeInfo.contentType
                } : null
            };

            logger.info(`✅ YouTube content found: ${youtubeContent.title}`);

            return response.success(res, enhancedContent, 'YouTube content retrieved successfully');

        } catch (error) {
            logger.error('❌ Error fetching YouTube content:', { 
                error: error.message,
                contentId: req.params.id
            });

            return response.error(res, 'Failed to fetch YouTube content', 500, error.message);
        }
    }

    /**
     * Update YouTube content
     * PUT /api/youtube-content/:id
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const userRole = req.user.role;
            const updateData = req.body;

            logger.info(`✏️ Updating YouTube content: ${id}`);

            // Check if content exists
            const existingContent = await prisma.youTubeContent.findUnique({
                where: { id },
                select: { id: true, createdById: true, title: true }
            });

            if (!existingContent) {
                return response.error(res, 'YouTube content not found', 404, 'CONTENT_NOT_FOUND');
            }

            // Check permissions (only creator or admin can update)
            if (existingContent.createdById !== userId && userRole !== 'ADMIN') {
                return response.error(res, 'Access denied', 403, 'ACCESS_DENIED');
            }

            // If updating categoryId, check if category exists
            if (updateData.categoryId) {
                const category = await prisma.category.findUnique({
                    where: { id: updateData.categoryId },
                    select: { id: true }
                });

                if (!category) {
                    return response.error(res, 'Category not found', 404, 'CATEGORY_NOT_FOUND');
                }
            }

            // If updating YouTube URL, validate and auto-enhance
            if (updateData.youtubeUrl) {
                // Validate new YouTube URL
                if (!youtubeUtils.isValidYouTubeUrl(updateData.youtubeUrl)) {
                    return response.error(res, 'Invalid YouTube URL provided', 400, 'INVALID_YOUTUBE_URL');
                }

                // Check for duplicates
                const duplicateContent = await prisma.youTubeContent.findFirst({
                    where: { 
                        youtubeUrl: updateData.youtubeUrl,
                        id: { not: id }
                    }
                });

                if (duplicateContent) {
                    return response.error(res, 'YouTube URL already exists', 409, 'DUPLICATE_URL');
                }

                // Extract YouTube info for auto-enhancement
                const youtubeInfo = youtubeUtils.extractYouTubeInfo(updateData.youtubeUrl);
                if (youtubeInfo) {
                    // Auto-update content type if not explicitly provided
                    if (!updateData.contentType) {
                        updateData.contentType = youtubeInfo.contentType;
                        logger.info(`🔄 Auto-updated content type to: ${youtubeInfo.contentType}`);
                    }

                    // Auto-update thumbnail if not explicitly provided
                    if (!updateData.thumbnailUrl) {
                        updateData.thumbnailUrl = youtubeInfo.thumbnailUrl;
                        logger.info(`🖼️ Auto-updated thumbnail URL: ${youtubeInfo.thumbnailUrl}`);
                    }

                    // Store video ID for future use
                    updateData.videoId = youtubeInfo.videoId;
                }
            }

            // Update content
            const updatedContent = await prisma.youTubeContent.update({
                where: { id },
                data: updateData,
                include: {
                    category: {
                        select: { id: true, name: true, type: true }
                    },
                    createdBy: {
                        select: { id: true, name: true, email: true }
                    }
                }
            });

            logger.info(`✅ YouTube content updated: ${updatedContent.title}`);

            return response.success(res, updatedContent, 'YouTube content updated successfully');

        } catch (error) {
            logger.error('❌ Error updating YouTube content:', { 
                error: error.message,
                contentId: req.params.id,
                userId: req.user?.id
            });

            return response.error(res, 'Failed to update YouTube content', 500, error.message);
        }
    }

    /**
     * Delete YouTube content
     * DELETE /api/youtube-content/:id
     */
    async delete(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const userRole = req.user.role;

            logger.info(`🗑️ Deleting YouTube content: ${id}`);

            // Check if content exists
            const existingContent = await prisma.youTubeContent.findUnique({
                where: { id },
                select: { id: true, createdById: true, title: true }
            });

            if (!existingContent) {
                return response.error(res, 'YouTube content not found', 404, 'CONTENT_NOT_FOUND');
            }

            // Check permissions (only creator or admin can delete)
            if (existingContent.createdById !== userId && userRole !== 'ADMIN') {
                return response.error(res, 'Access denied', 403, 'ACCESS_DENIED');
            }

            // Delete content
            await prisma.youTubeContent.delete({
                where: { id }
            });

            logger.info(`✅ YouTube content deleted: ${existingContent.title}`);

            return response.success(res, { id }, 'YouTube content deleted successfully');

        } catch (error) {
            logger.error('❌ Error deleting YouTube content:', { 
                error: error.message,
                contentId: req.params.id,
                userId: req.user?.id
            });

            return response.error(res, 'Failed to delete YouTube content', 500, error.message);
        }
    }

    /**
     * Get YouTube content statistics
     * GET /api/youtube-content/stats
     */
    async getStats(req, res) {
        try {
            logger.info('📊 Fetching YouTube content statistics');

            const [
                totalContent,
                totalShorts,
                totalFullVideos,
                enabledContent,
                disabledContent,
                contentByCategory,
                topViewedContent,
                recentContent
            ] = await Promise.all([
                prisma.youTubeContent.count(),
                prisma.youTubeContent.count({ where: { contentType: 'SHORTS' } }),
                prisma.youTubeContent.count({ where: { contentType: 'FULL_VIDEO' } }),
                prisma.youTubeContent.count({ where: { isEnabled: true } }),
                prisma.youTubeContent.count({ where: { isEnabled: false } }),
                prisma.youTubeContent.groupBy({
                    by: ['categoryId'],
                    _count: { id: true },
                    orderBy: { _count: { id: 'desc' } },
                    take: 5
                }),
                prisma.youTubeContent.findMany({
                    take: 5,
                    orderBy: { viewCount: 'desc' },
                    select: { id: true, title: true, viewCount: true, contentType: true }
                }),
                prisma.youTubeContent.findMany({
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    select: { id: true, title: true, createdAt: true, contentType: true }
                })
            ]);

            const stats = {
                overview: {
                    totalContent,
                    totalShorts,
                    totalFullVideos,
                    enabledContent,
                    disabledContent,
                    enabledPercentage: totalContent > 0 ? Math.round((enabledContent / totalContent) * 100) : 0
                },
                byCategory: contentByCategory,
                topViewed: topViewedContent,
                recent: recentContent
            };

            logger.info(`✅ YouTube statistics compiled: ${totalContent} total contents`);

            return response.success(res, stats, 'YouTube content statistics retrieved successfully');

        } catch (error) {
            logger.error('❌ Error fetching YouTube statistics:', { 
                error: error.message 
            });

            return response.error(res, 'Failed to fetch YouTube statistics', 500, error.message);
        }
    }

    /**
     * Toggle content status (enable/disable)
     * PATCH /api/youtube-content/:id/toggle-status
     */
    async toggleStatus(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const userRole = req.user.role;

            logger.info(`🔄 Toggling status for YouTube content: ${id}`);

            // Check if content exists
            const existingContent = await prisma.youTubeContent.findUnique({
                where: { id },
                select: { id: true, createdById: true, title: true, isEnabled: true }
            });

            if (!existingContent) {
                return response.error(res, 'YouTube content not found', 404, 'CONTENT_NOT_FOUND');
            }

            // Check permissions (only creator or admin can toggle status)
            if (existingContent.createdById !== userId && userRole !== 'ADMIN') {
                return response.error(res, 'Access denied', 403, 'ACCESS_DENIED');
            }

            // Toggle status
            const updatedContent = await prisma.youTubeContent.update({
                where: { id },
                data: { isEnabled: !existingContent.isEnabled },
                include: {
                    category: {
                        select: { id: true, name: true, type: true }
                    }
                }
            });

            logger.info(`✅ Status toggled for: ${existingContent.title} - Now ${updatedContent.isEnabled ? 'enabled' : 'disabled'}`);

            return response.success(res, updatedContent, `YouTube content ${updatedContent.isEnabled ? 'enabled' : 'disabled'} successfully`);

        } catch (error) {
            logger.error('❌ Error toggling YouTube content status:', { 
                error: error.message,
                contentId: req.params.id
            });

            return response.error(res, 'Failed to toggle content status', 500, error.message);
        }
    }

    /**
     * Refresh thumbnail for YouTube content
     * PATCH /api/youtube-content/:id/refresh-thumbnail
     */
    async refreshThumbnail(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const userRole = req.user.role;
            const { quality = 'hqdefault' } = req.body;

            logger.info(`🔄 Refreshing thumbnail for YouTube content: ${id}`);

            // Check if content exists
            const existingContent = await prisma.youTubeContent.findUnique({
                where: { id },
                select: { 
                    id: true, 
                    createdById: true, 
                    title: true, 
                    youtubeUrl: true,
                    thumbnailUrl: true 
                }
            });

            if (!existingContent) {
                return response.error(res, 'YouTube content not found', 404, 'CONTENT_NOT_FOUND');
            }

            // Check permissions (only creator or admin can refresh thumbnail)
            if (existingContent.createdById !== userId && userRole !== 'ADMIN') {
                return response.error(res, 'Access denied', 403, 'ACCESS_DENIED');
            }

            // Extract YouTube info and generate new thumbnail
            const youtubeInfo = youtubeUtils.extractYouTubeInfo(existingContent.youtubeUrl);
            if (!youtubeInfo) {
                return response.error(res, 'Could not extract information from YouTube URL', 400, 'YOUTUBE_INFO_EXTRACTION_FAILED');
            }

            // Generate new thumbnail URL with specified quality
            const newThumbnailUrl = youtubeUtils.generateThumbnailUrl(youtubeInfo.videoId, quality);

            // Update content with new thumbnail
            const updatedContent = await prisma.youTubeContent.update({
                where: { id },
                data: { 
                    thumbnailUrl: newThumbnailUrl,
                    videoId: youtubeInfo.videoId 
                },
                include: {
                    category: {
                        select: { id: true, name: true, type: true }
                    }
                }
            });

            // Prepare response with thumbnail alternatives
            const responseData = {
                ...updatedContent,
                thumbnailAlternatives: youtubeInfo.thumbnails,
                refreshInfo: {
                    previousThumbnail: existingContent.thumbnailUrl,
                    newThumbnail: newThumbnailUrl,
                    quality: quality,
                    refreshedAt: new Date().toISOString()
                }
            };

            logger.info(`✅ Thumbnail refreshed for: ${existingContent.title} - Quality: ${quality}`);

            return response.success(res, responseData, 'Thumbnail refreshed successfully');

        } catch (error) {
            logger.error('❌ Error refreshing thumbnail:', { 
                error: error.message,
                contentId: req.params.id
            });

            return response.error(res, 'Failed to refresh thumbnail', 500, error.message);
        }
    }

    /**
     * Get thumbnail alternatives for YouTube content
     * GET /api/youtube-content/:id/thumbnails
     */
    async getThumbnails(req, res) {
        try {
            const { id } = req.params;

            logger.info(`🖼️ Getting thumbnails for YouTube content: ${id}`);

            // Check if content exists
            const existingContent = await prisma.youTubeContent.findUnique({
                where: { id },
                select: { 
                    id: true, 
                    title: true, 
                    youtubeUrl: true,
                    thumbnailUrl: true,
                    contentType: true
                }
            });

            if (!existingContent) {
                return response.error(res, 'YouTube content not found', 404, 'CONTENT_NOT_FOUND');
            }

            // Extract YouTube info and get all thumbnail alternatives
            const youtubeInfo = youtubeUtils.extractYouTubeInfo(existingContent.youtubeUrl);
            if (!youtubeInfo) {
                return response.error(res, 'Could not extract information from YouTube URL', 400, 'YOUTUBE_INFO_EXTRACTION_FAILED');
            }

            const thumbnailData = {
                contentId: id,
                contentTitle: existingContent.title,
                contentType: existingContent.contentType,
                currentThumbnail: existingContent.thumbnailUrl,
                videoId: youtubeInfo.videoId,
                isShorts: youtubeInfo.isShorts,
                thumbnailAlternatives: youtubeInfo.thumbnails,
                thumbnailQualities: {
                    default: { size: '120x90', description: 'Default quality' },
                    medium: { size: '320x180', description: 'Medium quality' },
                    high: { size: '480x360', description: 'High quality' },
                    standard: { size: '640x480', description: 'Standard definition' },
                    maxres: { size: '1280x720', description: 'Maximum resolution (may not be available for all videos)' }
                }
            };

            logger.info(`✅ Retrieved ${Object.keys(youtubeInfo.thumbnails).length} thumbnail alternatives`);

            return response.success(res, thumbnailData, 'Thumbnail alternatives retrieved successfully');

        } catch (error) {
            logger.error('❌ Error getting thumbnails:', { 
                error: error.message,
                contentId: req.params.id
            });

            return response.error(res, 'Failed to get thumbnail alternatives', 500, error.message);
        }
    }

    /**
     * Bulk refresh thumbnails for multiple YouTube contents
     * POST /api/youtube-content/bulk-refresh-thumbnails
     */
    async bulkRefreshThumbnails(req, res) {
        try {
            const userId = req.user.id;
            const userRole = req.user.role;
            const { contentIds, quality = 'hqdefault', onlyEmpty = false } = req.body;

            logger.info(`🔄 Bulk refreshing thumbnails for ${contentIds?.length || 'all'} contents`);

            // Build query based on user role and parameters
            let where = {};
            
            if (contentIds && Array.isArray(contentIds)) {
                where.id = { in: contentIds };
            }

            // If not admin, only allow user's own content
            if (userRole !== 'ADMIN') {
                where.createdById = userId;
            }

            // If onlyEmpty is true, only refresh content without thumbnails
            if (onlyEmpty) {
                where.OR = [
                    { thumbnailUrl: null },
                    { thumbnailUrl: '' }
                ];
            }

            // Get contents to update
            const contents = await prisma.youTubeContent.findMany({
                where,
                select: { id: true, title: true, youtubeUrl: true, thumbnailUrl: true }
            });

            if (contents.length === 0) {
                return response.success(res, { updated: 0, skipped: 0 }, 'No content found to update');
            }

            let updated = 0;
            let skipped = 0;
            const results = [];

            // Process each content
            for (const content of contents) {
                try {
                    const youtubeInfo = youtubeUtils.extractYouTubeInfo(content.youtubeUrl);
                    
                    if (!youtubeInfo) {
                        skipped++;
                        results.push({
                            id: content.id,
                            title: content.title,
                            status: 'skipped',
                            reason: 'Could not extract YouTube info'
                        });
                        continue;
                    }

                    const newThumbnailUrl = youtubeUtils.generateThumbnailUrl(youtubeInfo.videoId, quality);

                    await prisma.youTubeContent.update({
                        where: { id: content.id },
                        data: { 
                            thumbnailUrl: newThumbnailUrl,
                            videoId: youtubeInfo.videoId 
                        }
                    });

                    updated++;
                    results.push({
                        id: content.id,
                        title: content.title,
                        status: 'updated',
                        previousThumbnail: content.thumbnailUrl,
                        newThumbnail: newThumbnailUrl
                    });

                } catch (error) {
                    skipped++;
                    results.push({
                        id: content.id,
                        title: content.title,
                        status: 'error',
                        error: error.message
                    });
                }
            }

            logger.info(`✅ Bulk thumbnail refresh completed: ${updated} updated, ${skipped} skipped`);

            return response.success(res, {
                summary: { total: contents.length, updated, skipped },
                results,
                quality
            }, 'Bulk thumbnail refresh completed');

        } catch (error) {
            logger.error('❌ Error in bulk refresh thumbnails:', { 
                error: error.message,
                userId: req.user?.id
            });

            return response.error(res, 'Failed to bulk refresh thumbnails', 500, error.message);
        }
    }
}

export default new YouTubeContentController();
