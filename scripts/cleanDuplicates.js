import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Remove duplicate articles from the database
 */
async function removeDuplicateArticles() {
    try {
        // console.log('🧹 Starting duplicate article cleanup...');

        // Find duplicate articles by title + source combination
        const duplicatesByTitle = await prisma.article.groupBy({
            by: ['title', 'source'],
            _count: {
                id: true,
            },
            having: {
                id: {
                    _count: {
                        gt: 1,
                    },
                },
            },
        });
 
        // console.log(`Found ${duplicatesByTitle.length} sets of title+source duplicates`);

        let totalRemoved = 0;

        // Remove duplicates, keeping only the oldest (first) article
        for (const duplicate of duplicatesByTitle) {
            const articlesWithSameTitleSource = await prisma.article.findMany({
                where: {
                    title: duplicate.title,
                    source: duplicate.source,
                },
                orderBy: {
                    createdAt: 'asc', // Keep the oldest
                },
            });

            // Keep the first one, delete the rest
            const toDelete = articlesWithSameTitleSource.slice(1);
            
            if (toDelete.length > 0) {
                // console.log(`Removing ${toDelete.length} duplicates of: "${duplicate.title.substring(0, 50)}..."`);
                
                const deleteResult = await prisma.article.deleteMany({
                    where: {
                        id: {
                            in: toDelete.map(article => article.id),
                        },
                    },
                });

                totalRemoved += deleteResult.count;
            }
        }

        // Also check for URL duplicates
        const duplicatesByUrl = await prisma.article.groupBy({
            by: ['url'],
            _count: {
                id: true,
            },
            where: {
                url: {
                    not: null,
                },
            },
            having: {
                id: {
                    _count: {
                        gt: 1,
                    },
                },
            },
        });

        // console.log(`Found ${duplicatesByUrl.length} sets of URL duplicates`);

        // Remove URL duplicates, keeping only the oldest
        for (const duplicate of duplicatesByUrl) {
            const articlesWithSameUrl = await prisma.article.findMany({
                where: {
                    url: duplicate.url,
                },
                orderBy: {
                    createdAt: 'asc', // Keep the oldest
                },
            });

            // Keep the first one, delete the rest
            const toDelete = articlesWithSameUrl.slice(1);
            
            if (toDelete.length > 0) {
                // console.log(`Removing ${toDelete.length} URL duplicates of: ${duplicate.url}`);
                
                const deleteResult = await prisma.article.deleteMany({
                    where: {
                        id: {
                            in: toDelete.map(article => article.id),
                        },
                    },
                });

                totalRemoved += deleteResult.count;
            }
        }

        // console.log(`\n✅ Duplicate cleanup completed!`);
        // console.log(`📊 Total articles removed: ${totalRemoved}`);

        // Show final article count
        const finalCount = await prisma.article.count();
        // console.log(`📈 Remaining articles: ${finalCount}`);

    } catch (error) {
        console.error('❌ Error removing duplicate articles:', error);
    } finally {
        await prisma.$disconnect();
    }
}

/**
 * Show duplicate statistics without removing
 */
async function showDuplicateStats() {
    try {
        // console.log('📊 Analyzing duplicate articles...\n');

        // Count total articles
        const totalArticles = await prisma.article.count();
        // console.log(`Total articles: ${totalArticles}`);

        // Find title+source duplicates
        const titleSourceDuplicates = await prisma.article.groupBy({
            by: ['title', 'source'],
            _count: {
                id: true,
            },
            having: {
                id: {
                    _count: {
                        gt: 1,
                    },
                },
            },
        });

        // Find URL duplicates
        const urlDuplicates = await prisma.article.groupBy({
            by: ['url'],
            _count: {
                id: true,
            },
            where: {
                url: {
                    not: null,
                },
            },
            having: {
                id: {
                    _count: {
                        gt: 1,
                    },
                },
            },
        });

        // console.log(`\nDuplicate Analysis:`);
        // console.log(`📝 Title+Source duplicate groups: ${titleSourceDuplicates.length}`);
        // console.log(`🔗 URL duplicate groups: ${urlDuplicates.length}`);

        // Calculate total duplicate articles
        let totalTitleSourceDuplicates = 0;
        for (const group of titleSourceDuplicates) {
            totalTitleSourceDuplicates += group._count.id - 1; // Subtract 1 to keep the original
        }

        let totalUrlDuplicates = 0;
        for (const group of urlDuplicates) {
            totalUrlDuplicates += group._count.id - 1; // Subtract 1 to keep the original
        }

        // console.log(`🔄 Total title+source duplicates: ${totalTitleSourceDuplicates}`);
        // console.log(`🔄 Total URL duplicates: ${totalUrlDuplicates}`);
        // console.log(`🧮 Estimated articles after cleanup: ${totalArticles - Math.max(totalTitleSourceDuplicates, totalUrlDuplicates)}`);

        // Show some examples
        if (titleSourceDuplicates.length > 0) {
            // console.log(`\nExample title+source duplicates:`);
            for (let i = 0; i < Math.min(3, titleSourceDuplicates.length); i++) {
                const example = titleSourceDuplicates[i];
                // console.log(`  - "${example.title.substring(0, 60)}..." (${example._count.id} copies)`);
            }
        }

    } catch (error) {
        console.error('❌ Error analyzing duplicates:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run based on command line argument
const action = process.argv[2];

if (action === '--remove' || action === '-r') {
    removeDuplicateArticles();
} else if (action === '--stats' || action === '-s') {
    showDuplicateStats();
} else {
    // console.log('📋 Duplicate Article Management Tool');
    // console.log('=====================================');
    // console.log('Usage:');
    // console.log('  node cleanDuplicates.js --stats    Show duplicate statistics');
    // console.log('  node cleanDuplicates.js --remove   Remove duplicate articles');
    // console.log('');
    showDuplicateStats();
}

export { removeDuplicateArticles, showDuplicateStats };
