// Central export for all middleware modules using ES module syntax
import authModule, { auth, adminAuth,adminUserAuth } from './auth.js';
import uploadModule from './upload.js';
import validate from './validate.js';
import extractClientInfo from './extractClientInfo.js';

export { auth, adminAuth, authModule,adminUserAuth };
export const { singleUpload, multiUpload, fieldsUpload, handleUploadError } = uploadModule;
export const upload = uploadModule;
export { validate, extractClientInfo };
