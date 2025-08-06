import prisma from './prisma/index.js';

async function checkOrphanedSubscriptions() {
  try {
    const orphaned = await prisma.subscription.findMany({
      where: { userId: null },
      include: { user: true }
    });
    
    console.log('📊 Orphaned subscriptions found:', orphaned.length);
    
    if (orphaned.length > 0) {
      orphaned.forEach((sub, index) => {
        console.log(`${index + 1}. Subscription ID: ${sub.paddleSubscriptionId}`);
        console.log(`   Customer ID: ${sub.paddleCustomerId}`);
        console.log(`   Status: ${sub.status}`);
        console.log(`   Amount: ${sub.currency} ${sub.amount}`);
        console.log(`   Created: ${sub.createdAt}`);
        console.log(`   Metadata: ${sub.metadata?.needsManualLinking ? 'Needs manual linking' : 'No metadata'}`);
        console.log('---');
      });
    } else {
      console.log('✅ No orphaned subscriptions found');
    }
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Error checking orphaned subscriptions:', error.message);
    await prisma.$disconnect();
  }
}

checkOrphanedSubscriptions();
