// Central export for all middleware modules using ES module syntax
import authModule from './auth.js';
import uploadModule from './upload.js';
import validate from './validate.js';

export const { auth, adminAuth } = authModule;
export const upload = uploadModule;
export { validate };
