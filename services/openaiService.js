import OpenAI from 'openai';
import winston from 'winston';
import { OPENAI_CONFIG } from '../config/config.js';

// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] OpenAI Service: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
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

class OpenAIService {
    constructor() {
        if (OPENAI_CONFIG.enabled && OPENAI_CONFIG.apiKey) {
            this.openai = new OpenAI({
                apiKey: OPENAI_CONFIG.apiKey,
            });
            this.isEnabled = true;
            logger.info('🤖 OpenAI service initialized successfully');
        } else {
            this.isEnabled = false;
            logger.warn('⚠️  OpenAI service disabled - missing API key or disabled in config');
        }
    }

    /**
     * Generate article summary using OpenAI GPT
     * @param {string} content - Article content to summarize
     * @param {string} title - Article title for context
     * @param {string} language - Target language ('en' or 'ar')
     * @returns {Promise<string>} Generated summary
     */
    async generateSummary(content, title, language = 'en') {
        if (!this.isEnabled) {
            return null;
        }

        try {
            // Clean and prepare content
            const cleanContent = this.cleanContent(content);
            
            if (!cleanContent || cleanContent.length < 50) {
                logger.warn('Content too short for summarization');
                return null;
            }

            // Prepare prompt based on language
            const prompt = this.buildPrompt(cleanContent, title, language);

            logger.info(`🤖 Generating ${language} summary for: "${title.substring(0, 40)}..."`);

            const response = await this.openai.chat.completions.create({
                model: OPENAI_CONFIG.model,
                messages: [
                    {
                        role: 'system',
                        content: this.getSystemPrompt(language)
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: OPENAI_CONFIG.maxTokens,
                temperature: OPENAI_CONFIG.temperature,
            });

            const summary = response.choices[0]?.message?.content?.trim();
            
            if (summary) {
                logger.info(`✅ Generated ${language} summary (${summary.length} chars)`);
                return summary;
            } else {
                logger.warn('OpenAI returned empty summary');
                return null;
            }

        } catch (error) {
            logger.error('❌ Error generating summary with OpenAI:', {
                error: error.message,
                title: title.substring(0, 30),
                language
            });
            return null;
        }
    }

    /**
     * Generate summaries in both languages efficiently
     * @param {string} content - Article content
     * @param {string} title - Article title
     * @returns {Promise<Object>} Object with english and arabic summaries
     */
    async generateBilingualSummaries(content, title) {
        const results = {
            english: null,
            arabic: null
        };

        if (!this.isEnabled) {
            return results;
        }

        try {
            // Generate summaries in parallel for efficiency
            const [englishResult, arabicResult] = await Promise.allSettled([
                this.generateSummary(content, title, 'en'),
                this.generateSummary(content, title, 'ar')
            ]);

            if (englishResult.status === 'fulfilled' && englishResult.value) {
                results.english = englishResult.value;
            }

            if (arabicResult.status === 'fulfilled' && arabicResult.value) {
                results.arabic = arabicResult.value;
            }

            const successCount = (results.english ? 1 : 0) + (results.arabic ? 1 : 0);
            logger.info(`🎯 Generated ${successCount}/2 summaries for: "${title.substring(0, 30)}..."`);

        } catch (error) {
            logger.error('❌ Error generating bilingual summaries:', { error: error.message });
        }

        return results;
    }

    /**
     * Clean content for summarization
     * @param {string} content - Raw content
     * @returns {string} Cleaned content
     */
    cleanContent(content) {
        if (!content) return '';
        
        return content
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&[^;]+;/g, ' ') // Remove HTML entities
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/[^\w\s\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF.,!?;:()\-]/g, '') // Keep alphanumeric, Arabic, basic punctuation
            .trim()
            .substring(0, 2500); // Limit content length to avoid token limits
    }

    /**
     * Build prompt for summarization
     * @param {string} content - Cleaned content
     * @param {string} title - Article title
     * @param {string} language - Target language
     * @returns {string} Formatted prompt
     */
    buildPrompt(content, title, language) {
        if (language === 'ar') {
            return `يرجى كتابة ملخص مختصر ومفيد لهذا المقال الإخباري باللغة العربية:

العنوان: ${title}

المحتوى: ${content}

المتطلبات:
- اكتب ملخصاً واضحاً وواقعياً باللغة العربية
- ركز على الحقائق الرئيسية والنقاط المهمة
- اجعله بين 2-3 جمل (50-150 كلمة)
- حافظ على الأسلوب الصحفي
- ضمن أهم المعلومات من المقال`;
        } else {
            return `Please provide a concise and informative summary of this news article in English:

Title: ${title}

Content: ${content}

Requirements:
- Write a clear, factual summary in English
- Focus on the main facts and key points
- Keep it between 2-3 sentences (50-150 words)
- Maintain journalistic tone
- Include the most important information from the article`;
        }
    }

    /**
     * Get system prompt based on language
     * @param {string} language - Target language
     * @returns {string} System prompt
     */
    getSystemPrompt(language) {
        if (language === 'ar') {
            return `أنت محرر أخبار محترف متخصص في كتابة ملخصات مقالات إخبارية باللغة العربية. اكتب ملخصات واضحة ومفيدة تركز على الحقائق الأساسية والنقاط الرئيسية بأسلوب صحفي احترافي.`;
        } else {
            return `You are a professional news editor specialized in writing clear, concise news article summaries. Focus on key facts, main points, and important information while maintaining a professional journalistic tone.`;
        }
    }

    /**
     * Generate fallback summary (current method)
     * @param {string} content - Article content
     * @param {number} maxLength - Maximum length
     * @returns {string} Fallback summary
     */
    generateFallbackSummary(content, maxLength = 300) {
        if (!content) return '';
        
        const cleaned = this.cleanContent(content);
        if (cleaned.length <= maxLength) return cleaned;
        
        // Find a good breaking point near the limit
        const truncated = cleaned.substring(0, maxLength);
        const lastSentence = truncated.lastIndexOf('.');
        const lastSpace = truncated.lastIndexOf(' ');
        
        if (lastSentence > maxLength * 0.7) {
            return truncated.substring(0, lastSentence + 1);
        } else if (lastSpace > maxLength * 0.8) {
            return truncated.substring(0, lastSpace) + '...';
        } else {
            return truncated + '...';
        }
    }

    /**
     * Check if OpenAI service is available
     * @returns {boolean} Service availability
     */
    isAvailable() {
        return this.isEnabled;
    }
}

export default new OpenAIService();
