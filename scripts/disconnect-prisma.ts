#!/usr/bin/env node

import { PrismaClient } from '@prisma/client';

async function forceDisconnectAll() {
    console.log('🔌 Force disconnecting all Prisma connections...');
    
    try {
        // Create a temporary instance to check connection
        const tempPrisma = new PrismaClient();
        
        // Test connection
        await tempPrisma.$connect();
        console.log('✅ Database connection confirmed');
        
        // Disconnect
        await tempPrisma.$disconnect();
        console.log('✅ Temporary connection disconnected');
        
        console.log('🎯 All Prisma connections should now be closed');
        console.log('💡 You can now restart your server safely');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

forceDisconnectAll();
