import prisma from '../prisma/index.js';
import winston from 'winston';

// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] Admin Setup: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

/**
 * Create admin user if it doesn't exist
 */
async function createAdminUser() {
    try {
        const adminEmail = 'muhammadahsanty@gmail.com';
        const adminPassword = '$2a$10$LsCrZnsbDhZuHIWBjAnZPuFmuSZDA0mJsqKAfhnm9cnGWgmqEdeiK'; // Pre-hashed password
        const adminName = 'Muhammad Ahsan';

        // Check if admin user already exists
        const existingAdmin = await prisma.user.findUnique({
            where: { email: adminEmail }
        });

        if (existingAdmin) {
            logger.info(`Admin user already exists: ${adminEmail}`);
            
            // Update admin role if not set
            if (existingAdmin.role !== 'ADMIN') {
                await prisma.user.update({
                    where: { id: existingAdmin.id },
                    data: { role: 'ADMIN' }
                });
                logger.info(`Updated user ${adminEmail} role to ADMIN`);
            }
            
            return existingAdmin;
        }

        // Create new admin user
        const adminUser = await prisma.user.create({
            data: {
                email: adminEmail,
                password: adminPassword, // Already hashed
                name: {
                    english: adminName,
                    arabic: 'محمد أحسان' // Arabic translation
                },
                role: 'ADMIN',
                isVerified: true,
                emailVerifiedAt: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            }
        });

        logger.info(`✅ Admin user created successfully: ${adminEmail}`, {
            userId: adminUser.id,
            email: adminUser.email,
            role: adminUser.role
        });

        return adminUser;

    } catch (error) {
        logger.error('❌ Error creating admin user:', error);
        throw error;
    }
}

/**
 * Initialize admin setup
 */
async function initializeAdmin() {
    try {
        logger.info('🔐 Initializing admin user setup...');
        
        const admin = await createAdminUser();
        
        logger.info('✅ Admin setup completed successfully', {
            adminId: admin.id,
            email: admin.email
        });

        return admin;

    } catch (error) {
        logger.error('❌ Admin setup failed:', error);
        throw error;
    }
}

export default initializeAdmin;
export { createAdminUser };
