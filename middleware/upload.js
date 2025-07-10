import multer from 'multer';
import response from '../utils/response.js';

// Configure multer with memory storage for Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    // Allow images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image and video files are allowed!'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Single file upload middleware
const singleUpload = (fieldName = 'logo') => {
    return (req, res, next) => {
        upload.single(fieldName)(req, res, (err) => {
            if (err) {
                if (err instanceof multer.MulterError) {
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        return response.error(res, 'File too large. Maximum size is 10MB', 400);
                    }
                    return response.error(res, `Upload error: ${err.message}`, 400);
                }
                return response.error(res, err.message, 400);
            }
            next();
        });
    };
};

// Multiple files upload middleware
const multiUpload = (fieldName = 'images', maxCount = 5) => {
    return (req, res, next) => {
        upload.array(fieldName, maxCount)(req, res, (err) => {
            if (err) {
                if (err instanceof multer.MulterError) {
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        return response.error(res, 'One or more files are too large. Maximum size is 10MB per file', 400);
                    }
                    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
                        return response.error(res, `Too many files. Maximum ${maxCount} files allowed`, 400);
                    }
                    return response.error(res, `Upload error: ${err.message}`, 400);
                }
                return response.error(res, err.message, 400);
            }
            next();
        });
    };
};

// Fields upload middleware for multiple fields
const fieldsUpload = (fields) => {
    return (req, res, next) => {
        upload.fields(fields)(req, res, (err) => {
            if (err) {
                if (err instanceof multer.MulterError) {
                    if (err.code === 'LIMIT_FILE_SIZE') {
                        return response.error(res, 'File too large. Maximum size is 10MB', 400);
                    }
                    return response.error(res, `Upload error: ${err.message}`, 400);
                }
                return response.error(res, err.message, 400);
            }
            next();
        });
    };
};

// Middleware to handle upload errors
const handleUploadError = (req, res, next) => {
    if (req.fileValidationError) {
        return response.error(res, req.fileValidationError.message, 400);
    }
    next();
};

export default {
    singleUpload,
    multiUpload,
    fieldsUpload,
    handleUploadError
};
