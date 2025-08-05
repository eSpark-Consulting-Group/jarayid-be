import { response, pagination } from '../utils/index.js';
import { cloudinaryService } from '../services/index.js';
import openaiService from '../services/openaiService.js';
import winston from 'winston';
import prisma from '../prisma/index.js';


// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] category Controller: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
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

class CategoryController {
    constructor() {
        this.prisma = prisma;
        
        // Bind methods to preserve 'this' context
        this.createCategory = this.createCategory.bind(this);
        this.getAllCategories = this.getAllCategories.bind(this);
        this.getCategoryById = this.getCategoryById.bind(this);
        this.updateCategory = this.updateCategory.bind(this);
        this.deleteCategory = this.deleteCategory.bind(this);
        this.extractTranslatedField = this.extractTranslatedField.bind(this);
    }

    async createCategory(req, res) {
        const { name, type, videoUrl, description, seoMeta, thresholdDays, customFields, autoTranslate } = req.body;

        try {
            const existingCategory = await prisma.category.findFirst({
                where: { 
                    name: {
                        equals: name,
                        mode: 'insensitive'
                    }
                }
            });

            if (existingCategory) {
                return response.error(res, 'Category with this name already exists', 409);
            }

            let logoData = null;

            if (req.file) {
                try {
                    logoData = await cloudinaryService.uploadImage(
                        req.file.buffer,
                        req.file.originalname,
                        'categories'
                    );
                } catch (uploadError) {
                    logger.error('Logo upload error:', { error: uploadError?.message || uploadError });
                    return response.error(res, 'Failed to upload logo', 400);
                }
            }

            const categoryData = {
                name,
                type,
                videoUrl,
                description,
                seoMeta: seoMeta || {},
                thresholdDays: thresholdDays || 7,
                customFields: customFields || null,
                createdById: req.user.id 
            };

            // Auto-generate translated content if OpenAI is available
            if (openaiService.isAvailable()) {
                try {
                    logger.info(`Starting auto-translation for new category: ${name}`);
                    
                    // Prepare content for translation
                    let translationText = '';
                    if (name) {
                        translationText += `Name: ${name}\n`;
                    }
                    if (description) {
                        translationText += `Description: ${description}\n`;
                    }
                    if (seoMeta) {
                        // Handle seoMeta whether it's a string or object
                        let seoMetaObj = seoMeta;
                        if (typeof seoMeta === 'string') {
                            try {
                                seoMetaObj = JSON.parse(seoMeta);
                            } catch (e) {
                                logger.warn('Failed to parse seoMeta string:', seoMeta);
                                seoMetaObj = {};
                            }
                        }
                        
                        if (seoMetaObj.title) {
                            translationText += `SEO Title: ${seoMetaObj.title}\n`;
                        }
                        if (seoMetaObj.description) {
                            translationText += `SEO Description: ${seoMetaObj.description}\n`;
                        }
                        if (seoMetaObj.keywords) {
                            const keywords = Array.isArray(seoMetaObj.keywords) 
                                ? seoMetaObj.keywords.join(', ')
                                : seoMetaObj.keywords;
                            translationText += `SEO Keywords: ${keywords}\n`;
                        }
                    }

                    if (translationText.trim()) {
                        logger.info(`Translation text prepared for "${name}":`, { translationText });
                        const translationResult = await openaiService.translateContent(translationText, 'auto');
                        
                        logger.info(`Translation result for "${name}":`, { 
                            success: translationResult.success,
                            arabicContentLength: translationResult.arabicContent?.length || 0,
                            englishContentLength: translationResult.englishContent?.length || 0,
                            arabicContent: translationResult.arabicContent,
                            englishContent: translationResult.englishContent,
                            sourceLanguage: translationResult.sourceLanguage
                        });
                        
                        if (translationResult.success) {
                            categoryData.translatedContent = {
                                arabic: {
                                    name: this.extractTranslatedField(translationResult.arabicContent, 'Name'),
                                    description: this.extractTranslatedField(translationResult.arabicContent, 'Description'),
                                    seoMeta: {
                                        title: this.extractTranslatedField(translationResult.arabicContent, 'SEO Title'),
                                        description: this.extractTranslatedField(translationResult.arabicContent, 'SEO Description'),
                                        keywords: this.extractTranslatedField(translationResult.arabicContent, 'SEO Keywords')
                                    }
                                },
                                english: {
                                    name: this.extractTranslatedField(translationResult.englishContent, 'Name'),
                                    description: this.extractTranslatedField(translationResult.englishContent, 'Description'),
                                    seoMeta: {
                                        title: this.extractTranslatedField(translationResult.englishContent, 'SEO Title'),
                                        description: this.extractTranslatedField(translationResult.englishContent, 'SEO Description'),
                                        keywords: this.extractTranslatedField(translationResult.englishContent, 'SEO Keywords')
                                    }
                                },
                                translatedAt: translationResult.translatedAt,
                                sourceLanguage: translationResult.sourceLanguage
                            };

                            logger.info(`✅ Successfully translated new category content: ${name}`);
                        } else {
                            logger.warn(`⚠️ Translation failed for new category: ${name}`, { error: translationResult.error });
                        }
                    }
                } catch (translationError) {
                    logger.error('Translation error during category creation:', { 
                        error: translationError?.message || translationError,
                        categoryName: name 
                    });
                    // Continue with creation even if translation fails
                }
            }

            if (logoData) {
                categoryData.logo = logoData.url;
                categoryData.logoKey = logoData.key;
            }

            const category = await prisma.category.create({
                data: categoryData,
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            });

            return response.success(res, category, 'Category created successfully', 201);
        } catch (error) {
            logger.error('Create category error:', { error: error?.message || error });
            return response.error(res, 'Failed to create category', 500);
        }
    }

    async getAllCategories(req, res) {
        try {
            const { type, search } = req.query;
            
            // Check if limit is provided, if not, get all results
            const hasLimit = req.query.limit !== undefined;
            
            let skip, take, page, limit, paginationOptions;
            
            if (hasLimit) {
                // Use pagination when limit is provided
                const paginationParams = pagination.getPaginationParams(req.query, {
                    defaultLimit: 10,
                    maxLimit: 1000
                });
                skip = paginationParams.skip;
                take = paginationParams.take;
                page = paginationParams.page;
                limit = paginationParams.limit;
                paginationOptions = { defaultLimit: 10, maxLimit: 1000 };
            } else {
                // No pagination when limit is not provided
                skip = undefined;
                take = undefined;
                page = 1;
                limit = null;
                paginationOptions = { defaultLimit: null, maxLimit: 1000 };
            }

            const where = {};
            
            if (type) {
                where.type = type;
            }

            if (search) {
                where.name = {
                    contains: search,
                    mode: 'insensitive'
                };
            }

            const [categories, total] = await Promise.all([
                prisma.category.findMany({
                    where,
                    skip: skip,
                    take: take,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        createdBy: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        },
                        youtubeContents: {
                            where: { isEnabled: true },
                            orderBy: { createdAt: 'desc' },
                            select: {
                                id: true,
                                title: true,
                                youtubeUrl: true,
                                contentType: true,
                                thumbnailUrl: true,
                                translatedContent:true,
                                duration: true,
                                viewCount: true,
                                deviceType: true,
                                createdAt: true
                            }
                        },
                        _count: {
                            select: {
                                articles: true,
                                rssFeeds: true,
                                youtubeContents: true
                            }
                        }
                    }
                }),
                prisma.category.count({ where })
            ]);

            // Enhance categories with YouTube content statistics
            const enhancedCategories = categories.map(category => ({
                ...category,
                youtubeStats: {
                    total: category.youtubeContents.length,
                    shorts: category.youtubeContents.filter(content => content.contentType === 'SHORTS').length,
                    fullVideos: category.youtubeContents.filter(content => content.contentType === 'FULL_VIDEO').length,
                    totalViews: category.youtubeContents.reduce((sum, content) => sum + content.viewCount, 0)
                }
            }));

            // Create paginated response
            let responseData;
            if (hasLimit) {
                responseData = pagination.createPaginatedResponse(
                    enhancedCategories, 
                    req.query, 
                    total, 
                    paginationOptions
                );
            } else {
                // Return all data without pagination info
                responseData = {
                    items: enhancedCategories,
                    meta: {
                        itemCount: enhancedCategories.length,
                        totalItems: total
                    }
                };
            }

            return response.success(res, responseData, 'Categories retrieved successfully');
        } catch (error) {
            logger.error('Get categories error:', { error: error?.message || error });
            return response.error(res, 'Failed to retrieve categories', 500);
        }
    }

    async getCategoryById(req, res) {
        const { id } = req.params;

        try {
            const category = await prisma.category.findUnique({
                where: { id },
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    youtubeContents: {
                        where: { isEnabled: true },
                        orderBy: [
                            { contentType: 'asc' }, // SHORTS first, then FULL_VIDEO
                            { createdAt: 'desc' }
                        ],
                        select: {
                            id: true,
                            title: true,
                            youtubeUrl: true,
                            contentType: true,
                            thumbnailUrl: true,
                            translatedContent:true,
                            duration: true,
                            viewCount: true,
                            deviceType: true,
                            description: true,
                            createdAt: true,
                            createdBy: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    },
                    _count: {
                        select: {
                            articles: true,
                            rssFeeds: true,
                            youtubeContents: true
                        }
                    }
                }
            });

            if (!category) {
                return response.error(res, 'Category not found', 404);
            }

            // Enhance category with YouTube content statistics and grouped content
            const enhancedCategory = {
                ...category,
                youtubeStats: {
                    total: category.youtubeContents.length,
                    shorts: category.youtubeContents.filter(content => content.contentType === 'SHORTS').length,
                    fullVideos: category.youtubeContents.filter(content => content.contentType === 'FULL_VIDEO').length,
                    totalViews: category.youtubeContents.reduce((sum, content) => sum + content.viewCount, 0)
                },
                youtubeContentsByType: {
                    shorts: category.youtubeContents.filter(content => content.contentType === 'SHORTS'),
                    fullVideos: category.youtubeContents.filter(content => content.contentType === 'FULL_VIDEO')
                }
            };

            return response.success(res, enhancedCategory, 'Category retrieved successfully');
        } catch (error) {
            logger.error('Get category error:', { error: error?.message || error });
            return response.error(res, 'Failed to retrieve category', 500);
        }
    }

    async updateCategory(req, res) {
        const { id } = req.params;
        const { name, type, videoUrl, description, seoMeta, thresholdDays, customFields, autoTranslate } = req.body;

        try {
            const existingCategory = await prisma.category.findUnique({
                where: { id }
            });

            if (!existingCategory) {
                return response.error(res, 'Category not found', 404);
            }

            if (name && name !== existingCategory.name) {
                const duplicateCategory = await prisma.category.findFirst({
                    where: {
                        name: {
                            equals: name,
                            mode: 'insensitive'
                        },
                        id: {
                            not: id
                        }
                    }
                });

                if (duplicateCategory) {
                    return response.error(res, 'Category with this name already exists', 409);
                }
            }

            const updateData = {};
            if (name !== undefined) updateData.name = name;
            if (type !== undefined) updateData.type = type;
            if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
            if (description !== undefined) updateData.description = description;
            if (seoMeta !== undefined) updateData.seoMeta = seoMeta;
            if (thresholdDays !== undefined) updateData.thresholdDays = thresholdDays;
            if (customFields !== undefined) updateData.customFields = customFields;

            // Handle auto-translation if OpenAI is available
            if (openaiService.isAvailable()) {
                try {
                    logger.info(`Starting auto-translation for category: ${existingCategory.name}`);
                    
                    const contentToTranslate = {
                        name: updateData.name || existingCategory.name,
                        description: updateData.description || existingCategory.description,
                        seoMeta: updateData.seoMeta || existingCategory.seoMeta
                    };

                    // Prepare content for translation
                    let translationText = '';
                    if (contentToTranslate.name) {
                        translationText += `Name: ${contentToTranslate.name}\n`;
                    }
                    if (contentToTranslate.description) {
                        translationText += `Description: ${contentToTranslate.description}\n`;
                    }
                    if (contentToTranslate.seoMeta) {
                        // Handle seoMeta whether it's a string or object
                        let seoMetaObj = contentToTranslate.seoMeta;
                        if (typeof contentToTranslate.seoMeta === 'string') {
                            try {
                                seoMetaObj = JSON.parse(contentToTranslate.seoMeta);
                            } catch (e) {
                                logger.warn('Failed to parse seoMeta string:', contentToTranslate.seoMeta);
                                seoMetaObj = {};
                            }
                        }
                        
                        if (seoMetaObj.title) {
                            translationText += `SEO Title: ${seoMetaObj.title}\n`;
                        }
                        if (seoMetaObj.description) {
                            translationText += `SEO Description: ${seoMetaObj.description}\n`;
                        }
                        if (seoMetaObj.keywords) {
                            const keywords = Array.isArray(seoMetaObj.keywords) 
                                ? seoMetaObj.keywords.join(', ')
                                : seoMetaObj.keywords;
                            translationText += `SEO Keywords: ${keywords}\n`;
                        }
                    }

                    if (translationText.trim()) {
                        // Translate the content to Arabic and English
                        const translationResult = await openaiService.translateContent(translationText, 'auto');
                        
                        if (translationResult.success) {
                            const existingTranslatedContent = existingCategory.translatedContent || {};
                            
                            updateData.translatedContent = {
                                ...existingTranslatedContent,
                                arabic: {
                                    name: this.extractTranslatedField(translationResult.arabicContent, 'Name'),
                                    description: this.extractTranslatedField(translationResult.arabicContent, 'Description'),
                                    seoMeta: {
                                        title: this.extractTranslatedField(translationResult.arabicContent, 'SEO Title'),
                                        description: this.extractTranslatedField(translationResult.arabicContent, 'SEO Description'),
                                        keywords: this.extractTranslatedField(translationResult.arabicContent, 'SEO Keywords')
                                    }
                                },
                                english: {
                                    name: this.extractTranslatedField(translationResult.englishContent, 'Name'),
                                    description: this.extractTranslatedField(translationResult.englishContent, 'Description'),
                                    seoMeta: {
                                        title: this.extractTranslatedField(translationResult.englishContent, 'SEO Title'),
                                        description: this.extractTranslatedField(translationResult.englishContent, 'SEO Description'),
                                        keywords: this.extractTranslatedField(translationResult.englishContent, 'SEO Keywords')
                                    }
                                },
                                translatedAt: translationResult.translatedAt,
                                sourceLanguage: translationResult.sourceLanguage
                            };

                            logger.info(`✅ Successfully translated category content for: ${existingCategory.name}`);
                        } else {
                            logger.warn(`⚠️ Translation failed for category: ${existingCategory.name}`, { error: translationResult.error });
                        }
                    }
                } catch (translationError) {
                    logger.error('Translation error during category update:', { 
                        error: translationError?.message || translationError,
                        categoryId: id 
                    });
                    // Continue with update even if translation fails
                }
            }

            if (req.file) {
                try {
                    if (existingCategory.logoKey) {
                        await cloudinaryService.deleteFile(existingCategory.logoKey);
                    }

                    const logoData = await cloudinaryService.uploadImage(
                        req.file.buffer,
                        req.file.originalname,
                        'categories'
                    );

                    updateData.logo = logoData.url;
                    updateData.logoKey = logoData.key;
                } catch (uploadError) {
                    logger.error('Logo upload error:', { error: uploadError?.message || uploadError });
                    return response.error(res, 'Failed to upload new logo', 400);
                }
            }

            const category = await prisma.category.update({
                where: { id },
                data: updateData,
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            });

            return response.success(res, category, 'Category updated successfully');
        } catch (error) {
            logger.error('Update category error:', { error: error?.message || error });
            return response.error(res, 'Failed to update category', 500);
        }
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
        const truncatedText = translatedText.length > 500 ? translatedText.substring(0, 500) + '...' : translatedText;
        logger.info(`Extracting field "${fieldName}" from translated text:`, { truncatedText });
        
        // Try multiple regex patterns to match different response formats
        const patterns = [
            // Standard format: "FieldName: value"
            new RegExp(`${fieldName}:\\s*(.+?)(?=\\n|$)`, 'i'),
            // Quoted format: "FieldName: "value""
            new RegExp(`${fieldName}:\\s*"([^"]+)"`, 'i'),
            // Single quoted format: "FieldName: 'value'"
            new RegExp(`${fieldName}:\\s*'([^']+)'`, 'i'),
            // With extra text: "FieldName (Arabic): value"
            new RegExp(`${fieldName}[^:]*:\\s*(.+?)(?=\\n|$)`, 'i'),
            // Arabic format variations
            new RegExp(`${fieldName}.*?:\\s*(.+?)(?=\\n|$)`, 'i'),
            // Line-by-line search (more flexible)
            new RegExp(`^.*${fieldName}.*?:\\s*(.+?)$`, 'mi'),
            // Handle potential Unicode issues with Arabic
            new RegExp(`${fieldName}[\\s\\u200B-\\u200D\\uFEFF]*:\\s*(.+?)(?=\\n|$)`, 'i')
        ];
        
        for (let i = 0; i < patterns.length; i++) {
            const regex = patterns[i];
            const match = translatedText.match(regex);
            if (match && match[1] && match[1].trim()) {
                const extractedValue = match[1].trim().replace(/^["']|["']$/g, ''); // Remove quotes
                if (extractedValue && extractedValue !== 'null' && extractedValue !== 'undefined') {
                    logger.info(`Successfully extracted "${fieldName}" using pattern ${i + 1}: ${extractedValue}`);
                    return extractedValue;
                }
            }
        }
        
        // If no pattern worked, try to find any line containing the field name
        const lines = translatedText.split('\n');
        for (const line of lines) {
            if (line.toLowerCase().includes(fieldName.toLowerCase()) && line.includes(':')) {
                const parts = line.split(':');
                if (parts.length >= 2) {
                    const value = parts.slice(1).join(':').trim().replace(/^["']|["']$/g, '');
                    if (value && value !== 'null' && value !== 'undefined') {
                        logger.info(`Successfully extracted "${fieldName}" from line: ${value}`);
                        return value;
                    }
                }
            }
        }
        
        logger.warn(`Could not extract field "${fieldName}" from translated text. Available content: ${truncatedText}`);
        return null;
    }

    async deleteCategory(req, res) {
        const { id } = req.params;

        try {
            const existingCategory = await prisma.category.findUnique({
                where: { id },
                include: {
                    _count: {
                        select: {
                            articles: true,
                            rssFeeds: true
                        }
                    }
                }
            });

            if (!existingCategory) {
                return response.error(res, 'Category not found', 404);
            }

            if (existingCategory._count.articles > 0 || existingCategory._count.rssFeeds > 0) {
                return response.error(res, 'Cannot delete category that has associated articles or RSS feeds', 409);
            }

            if (existingCategory.logoKey) {
                try {
                    await cloudinaryService.deleteFile(existingCategory.logoKey);
                } catch (deleteError) {
                    logger.error('Failed to delete logo from cloudinary:', { error: deleteError?.message || deleteError });
                }
            }

            await prisma.category.delete({
                where: { id }
            });

            return response.success(res, null, 'Category deleted successfully');
        } catch (error) {
            logger.error('Delete category error:', { error: error?.message || error });
            return response.error(res, 'Failed to delete category', 500);
        }
    }

}

const categoryController = new CategoryController();

export default categoryController;
