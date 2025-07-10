/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the user
 *         name:
 *           type: string
 *           description: User's full name
 *           minLength: 3
 *           maxLength: 30
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         loginType:
 *           type: string
 *           enum: [local, google, github]
 *           default: local
 *           description: Type of login method
 *         isSocialLogin:
 *           type: boolean
 *           description: Whether user registered via social login
 *         role:
 *           type: string
 *           enum: [ADMIN, USER]
 *           default: USER
 *           description: User role
 *         image:
 *           type: string
 *           format: uri
 *           description: User profile image URL
 *         country:
 *           type: string
 *           description: User's country
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - name
 *         - email
 *     UserSignup:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: User's full name
 *           minLength: 3
 *           maxLength: 30
 *           pattern: '^[a-zA-Z\\s]+$'
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         loginType:
 *           type: string
 *           enum: [local, google, github]
 *           default: local
 *           description: Type of login method
 *         password:
 *           type: string
 *           minLength: 8
 *           description: Password (required for local login only)
 *       required:
 *         - name
 *         - email
 *     UserLogin:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         loginType:
 *           type: string
 *           enum: [local, google, github]
 *           default: local
 *           description: Type of login method
 *         password:
 *           type: string
 *           minLength: 8
 *           description: Password (required for local login only)
 *       required:
 *         - email
 *     UserUpdate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: User's full name
 *           minLength: 3
 *           maxLength: 30
 *           pattern: '^[a-zA-Z\\s]+$'
 *         image:
 *           type: string
 *           format: binary
 *           description: User profile image file (multipart/form-data)
 *         country:
 *           type: string
 *           maxLength: 100
 *           description: User's country
 *       example:
 *         name: "Jane Doe"
 *         country: "United States"
 *         image: (binary file)
 *     ForgotPasswordRequest:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *       required:
 *         - email
 *       example:
 *         email: "user@example.com"
 *     VerifyResetTokenRequest:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: Password reset JWT token
 *       required:
 *         - token
 *     ResetPasswordRequest:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: Password reset JWT token
 *         newPassword:
 *           type: string
 *           minLength: 8
 *           description: New password (must contain uppercase, lowercase, number, and special character)
 *           pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'
 *       required:
 *         - token
 *         - newPassword
 *       example:
 *         token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *         newPassword: "NewSecure123!"
 *
 *     AuthResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               allOf:
 *                 - $ref: '#/components/schemas/User'
 *                 - type: object
 *                   properties:
 *                     password:
 *                       type: string
 *                       description: Password field excluded from response
 *                       readOnly: true
 *             token:
 *               type: string
 *               description: JWT authentication token
 *     SetPasswordRequest:
 *       type: object
 *       properties:
 *         currentPassword:
 *           type: string
 *           minLength: 8
 *           description: Current password for verification
 *         newPassword:
 *           type: string
 *           minLength: 8
 *           description: New password (must contain uppercase, lowercase, number, and special character)
 *           pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'
 *       required:
 *         - currentPassword
 *         - newPassword
 *       example:
 *         currentPassword: "OldPassword123!"
 *         newPassword: "NewPassword123!"
 */
