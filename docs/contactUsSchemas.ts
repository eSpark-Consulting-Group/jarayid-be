/**
 * @swagger
 * components:
 *   schemas:
 *     ContactUsRequest:
 *       type: object
 *       required:
 *         - name
 *         - business_name
 *         - contact_number
 *         - contact_email
 *         - message
 *         - country
 *       properties:
 *         name:
 *           type: string
 *           example: John Doe
 *         business_name:
 *           type: string
 *           example: Acme Corp
 *         contact_number:
 *           type: string
 *           example: +92 300 1234567
 *         contact_email:
 *           type: string
 *           format: email
 *           example: johndoe@example.com
 *         message:
 *           type: string
 *           example: I would like to inquire about your services.
 *         country:
 *           type: string
 *           example: Pakistan
 *
 *     ContactUsResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: success
 *         message:
 *           type: string
 *           example: Contact form submitted successfully
 *
 *     ContactUs:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: 64d2c13a2f4b9e27f0bcbbae
 *         name:
 *           type: string
 *           example: John Doe
 *         business_name:
 *           type: string
 *           example: Acme Corp
 *         contact_number:
 *           type: string
 *           example: +92 300 1234567
 *         contact_email:
 *           type: string
 *           example: johndoe@example.com
 *         message:
 *           type: string
 *           example: I would like to inquire about your services.
 *         country:
 *           type: string
 *           example: Pakistan
 *         created_at:
 *           type: string
 *           format: date-time
 *           example: 2025-07-24T10:00:00.000Z
 *
 *     ContactUsListResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: success
 *         count:
 *           type: integer
 *           example: 1
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ContactUs'
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: error
 *         message:
 *           type: string
 *           example: Something went wrong
 */
