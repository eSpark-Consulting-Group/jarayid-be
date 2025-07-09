import multer from 'multer';
import fs from 'fs';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import response from '../utils/response.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Single file upload middleware
const singleUpload = (fieldName = 'image') => {
    return upload.single(fieldName);
};

// Multiple files upload middleware
const multiUpload = (fieldName = 'images', maxCount = 5) => {
    return upload.array(fieldName, maxCount);
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
    handleUploadError
};
