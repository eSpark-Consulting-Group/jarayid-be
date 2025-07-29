/**
 * @swagger
 * components:
 *   schemas:
 *     SponsorAccount:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique sponsor account ID
 *         name:
 *           type: string
 *           description: Sponsor contact person or representative name
 *           minLength: 3
 *           maxLength: 255
 *         businessName:
 *           type: string
 *           description: Sponsor's business or organization name
 *           minLength: 3
 *           maxLength: 255
 *         website:
 *           type: string
 *           format: uri
 *           description: Sponsor's official website URL
 *         contactEmail:
 *           type: string
 *           format: email
 *           description: Contact email address for the sponsor
 *         phone:
 *           type: string
 *           description: Contact phone number for the sponsor
 *         category:
 *           type: string
 *           description: Category or classification of the sponsor
 *         contact:
 *           type: string
 *           description: Contact details
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, PENDING]
 *           description: Status of the sponsor account
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date and time when the sponsor account was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date and time when the sponsor account was last updated
 *       required:
 *         - name
 *         - businessName
 *         - contactEmail
 *         - category
 *         - status
 *     SponsorAccountCreate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Sponsor contact person or representative name
 *           minLength: 3
 *           maxLength: 255
 *         businessName:
 *           type: string
 *           description: Sponsor's business or organization name
 *           minLength: 3
 *           maxLength: 255
 *         website:
 *           type: string
 *           format: uri
 *           description: Sponsor's official website URL
 *         contactEmail:
 *           type: string
 *           format: email
 *           description: Contact email address for the sponsor
 *         phone:
 *           type: string
 *           description: Contact phone number for the sponsor
 *         category:
 *           type: string
 *           description: Category or classification of the sponsor
 *         contact:
 *           type: string
 *           description: Contact details
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, PENDING]
 *           description: Status of the sponsor account
 *       required:
 *         - name
 *         - businessName
 *         - contactEmail
 *         - category
 *         - status
 *       example:
 *         name: "John Doe"
 *         businessName: "Doe Enterprises"
 *         website: "https://www.doeenterprises.com"
 *         contactEmail: "contact@doeenterprises.com"
 *         phone: "+1 555-123-4567"
 *         category: "Technology"
 *         contact: "Contact details"
 *         status: "ACTIVE"
 *     SponsorAccountUpdate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Sponsor contact person or representative name
 *           minLength: 3
 *           maxLength: 255
 *         businessName:
 *           type: string
 *           description: Sponsor's business or organization name
 *           minLength: 3
 *           maxLength: 255
 *         website:
 *           type: string
 *           format: uri
 *           description: Sponsor's official website URL
 *         contactEmail:
 *           type: string
 *           format: email
 *           description: Contact email address for the sponsor
 *         phone:
 *           type: string
 *           description: Contact phone number for the sponsor
 *         category:
 *           type: string
 *           description: Category or classification of the sponsor
 *         contact:
 *           type: string
 *           description: Contact details
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, PENDING]
 *           description: Status of the sponsor account
 *       example:
 *         name: "Updated John Doe"
 *         businessName: "Doe Enterprises Ltd"
 *         website: "https://www.updateddoeenterprises.com"
 *         contactEmail: "updated.contact@doeenterprises.com"
 *         phone: "+1 555-987-6543"
 *         category: "Finance"
 *         contact: "Updated contact details"
 *         status: "INACTIVE"
 */
