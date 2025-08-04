import { v2 as cloudinary } from 'cloudinary';
import { CLOUD_CONFIG } from '../config/config.js';
import { v4 as uuidv4 } from 'uuid';

// Configure Cloudinary
cloudinary.config({
    cloud_name: CLOUD_CONFIG.cloudName,
    api_key: CLOUD_CONFIG.apiKey,
    api_secret: CLOUD_CONFIG.apiSecret,
});

class CloudinaryService {
    /**
     * Upload file to Cloudinary
     * @param {Buffer} fileBuffer - File buffer
     * @param {string} filename - Original filename
     * @param {string} folder - Subfolder within main folder (optional)
     * @returns {Promise<Object>} Upload result with URL and public_id
     */
    async uploadFile(fileBuffer, filename, folder = 'images') {
        try {
            // Generate unique key
            const uniqueKey = `${Date.now()}-${uuidv4()}`;
            const publicId = `${CLOUD_CONFIG.folder}/${folder}/${uniqueKey}`;

            return new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    {
                        public_id: publicId,
                        resource_type: 'auto',
                        folder: `${CLOUD_CONFIG.folder}/${folder}`,
                        transformation: [
                            { quality: 'auto:good' },
                            { fetch_format: 'auto' }
                        ]
                    },
                    (error, result) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve({
                                url: result.secure_url,
                                publicId: result.public_id,
                                key: uniqueKey,
                                format: result.format,
                                bytes: result.bytes,
                                width: result.width,
                                height: result.height,
                                originalFilename: filename
                            });
                        }
                    }
                ).end(fileBuffer);
            });
        } catch (error) {
            throw new Error(`File upload failed: ${error.message}`);
        }
    }

    /**
     * Upload image with specific optimizations
     * @param {Buffer} fileBuffer - Image buffer
     * @param {string} filename - Original filename
     * @param {string} folder - Subfolder (default: 'images')
     * @returns {Promise<Object>} Upload result
     */
    async uploadImage(fileBuffer, filename, folder = 'images') {
        try {
            const uniqueKey = `${Date.now()}-${uuidv4()}`;
            const publicId = `${CLOUD_CONFIG.folder}/${folder}/${uniqueKey}`;

            // Add timeout wrapper
            const uploadPromise = new Promise((resolve, reject) => {
                cloudinary.uploader.upload_stream(
                    {
                        public_id: publicId,
                        resource_type: 'image',
                        folder: `${CLOUD_CONFIG.folder}/${folder}`,
                        transformation: [
                            { quality: 'auto:good' },
                            { fetch_format: 'auto' },
                            { width: 1200, height: 800, crop: 'limit' }
                        ]
                    },
                    (error, result) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve({
                                url: result.secure_url,
                                publicId: result.public_id,
                                key: uniqueKey,
                                format: result.format,
                                bytes: result.bytes,
                                width: result.width,
                                height: result.height,
                                originalFilename: filename
                            });
                        }
                    }
                ).end(fileBuffer);
            });

            // Add 30-second timeout
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error('Cloudinary upload timeout after 30 seconds'));
                }, 30000);
            });

            return await Promise.race([uploadPromise, timeoutPromise]);
            
        } catch (error) {
            throw new Error(`Image upload failed: ${error.message}`);
        }
    }

    /**
     * Delete file from Cloudinary
     * @param {string} publicId - Cloudinary public ID
     * @returns {Promise<Object>} Deletion result
     */
    async deleteFile(publicId) {
        try {
            const result = await cloudinary.uploader.destroy(publicId);
            return result;
        } catch (error) {
            throw new Error(`File deletion failed: ${error.message}`);
        }
    }

    /**
     * Delete multiple files from Cloudinary
     * @param {Array<string>} publicIds - Array of Cloudinary public IDs
     * @returns {Promise<Object>} Deletion result
     */
    async deleteFiles(publicIds) {
        try {
            const result = await cloudinary.api.delete_resources(publicIds);
            return result;
        } catch (error) {
            throw new Error(`Files deletion failed: ${error.message}`);
        }
    }

    /**
     * Get file details from Cloudinary
     * @param {string} publicId - Cloudinary public ID
     * @returns {Promise<Object>} File details
     */
    async getFileDetails(publicId) {
        try {
            const result = await cloudinary.api.resource(publicId);
            return result;
        } catch (error) {
            throw new Error(`Failed to get file details: ${error.message}`);
        }
    }

    /**
     * Generate optimized URL for existing image
     * @param {string} publicId - Cloudinary public ID
     * @param {Object} options - Transformation options
     * @returns {string} Optimized URL
     */
    getOptimizedUrl(publicId, options = {}) {
        const defaultOptions = {
            quality: 'auto:good',
            fetch_format: 'auto'
        };

        const transformations = { ...defaultOptions, ...options };
        return cloudinary.url(publicId, transformations);
    }
}

export default new CloudinaryService();
