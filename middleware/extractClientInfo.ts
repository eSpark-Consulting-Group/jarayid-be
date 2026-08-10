/**
 * Middleware to extract client information for view tracking
 * This middleware should be used on routes where view tracking is needed
 */
const extractClientInfo = (req, res, next) => {
    // Extract IP address (considering proxy headers)
    const getClientIP = () => {
        return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.headers['x-real-ip'] ||
               req.headers['x-client-ip'] ||
               req.connection?.remoteAddress ||
               req.socket?.remoteAddress ||
               req.connection?.socket?.remoteAddress ||
               req.ip ||
               'unknown';
    };

    // Extract user agent
    const getUserAgent = () => {
        return req.headers['user-agent'] || 'unknown';
    };

    // Attach client info to request object
    req.clientInfo = {
        ipAddress: getClientIP(),
        userAgent: getUserAgent(),
        timestamp: new Date(),
        
        // Extract additional useful info
        referer: req.headers.referer || req.headers.referrer || null,
        acceptLanguage: req.headers['accept-language'] || null,
        
        // Device/browser detection helpers
        isMobile: /mobile|android|iphone|ipad|phone/i.test(getUserAgent()),
        isBot: /bot|crawler|spider|scrapy/i.test(getUserAgent()),
        
        // Create a view context object for the view tracking service
        getViewContext() {
            return {
                userId: req.user?.id || null,
                userRole: req.user?.role || null,
                ipAddress: this.ipAddress,
                userAgent: this.userAgent,
                referer: this.referer,
                isMobile: this.isMobile,
                isBot: this.isBot
            };
        }
    };

    next();
};

export default extractClientInfo;
