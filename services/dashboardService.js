import prisma from "../prisma/index.js";
import dayjs from "dayjs";

class DashboardService {
  async getDashboardData() {
    const [totalArticles, activeUsers, totalCategories, totalPageViews] =
      await Promise.all([
        prisma.article.count(),
        prisma.user.count({ where: { isBanned: false } }),
        prisma.category.count(),
        prisma.articleView.count(),
      ]);

    // --- Calculate percent change for overview stats ---
    const now = dayjs();
    const currentMonthStart = now.startOf("month").toDate();
    const lastMonthStart = now.subtract(1, "month").startOf("month").toDate();
    const lastMonthEnd = now.startOf("month").toDate();

    const [
      lastMonthArticles,
      lastMonthUsers,
      lastMonthCategories,
      lastMonthViews,
    ] = await Promise.all([
      prisma.article.count({
        where: {
          createdAt: { gte: lastMonthStart, lt: lastMonthEnd },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: { gte: lastMonthStart, lt: lastMonthEnd },
          isBanned: false,
        },
      }),
      prisma.category.count({
        where: {
          createdAt: { gte: lastMonthStart, lt: lastMonthEnd },
        },
      }),
      prisma.articleView.count({
        where: {
          viewedAt: { gte: lastMonthStart, lt: lastMonthEnd },
        },
      }),
    ]);

    const calculateChangePercent = (current, previous) =>
      previous === 0 ? 100 : ((current - previous) / previous) * 100;

    const overview = {
      totalArticles,
      activeUsers,
      totalCategories,
      pageViews: totalPageViews,
      articlesChangePercent: calculateChangePercent(
        totalArticles,
        lastMonthArticles
      ),
      usersChangePercent: calculateChangePercent(activeUsers, lastMonthUsers),
      categoriesChangePercent: calculateChangePercent(
        totalCategories,
        lastMonthCategories
      ),
      viewsChangePercent: calculateChangePercent(
        totalPageViews,
        lastMonthViews
      ),
    };

    // --- System Status (based on real metrics) ---
    const [rssFeedsCount, recentLoginActivity] = await Promise.all([
      prisma.rSSFeed.count(),
      prisma.user.findMany({
        where: {
          lastLoginAt: { gte: dayjs().subtract(7, "days").toDate() },
        },
        select: { id: true },
      }),
    ]);

    const systemStatus = [
      {
        service: "RSS Aggregation",
        status: rssFeedsCount > 0 ? "Healthy" : "Down",
      },
      {
        service: "User Authentication",
        status: recentLoginActivity.length > 0 ? "Healthy" : "Warning",
      },
      {
        service: "Content Processing",
        status: totalArticles > 0 ? "Healthy" : "Down",
      },
      {
        service: "Database",
        status: totalCategories > 0 ? "Healthy" : "Down",
      },
    ];

    // --- Article Publishing Trend (Last 7 days) ---
    const today = dayjs().startOf("day");
    const last7Days = [...Array(7)].map((_, i) => today.subtract(6 - i, "day"));

    const articlePublishingTrends = await Promise.all(
      last7Days.map(async (date) => {
        const count = await prisma.article.count({
          where: {
            createdAt: {
              gte: date.toDate(),
              lt: date.add(1, "day").toDate(),
            },
          },
        });

        return {
          day: date.format("dddd"),
          count,
        };
      })
    );

    // --- Page Views Trend (Last Month vs This Month) ---
    const startOfThisMonth = dayjs().startOf("month");
    const startOfLastMonth = dayjs().subtract(1, "month").startOf("month");
    const endOfLastMonth = startOfThisMonth;

    const daysInLastMonth = endOfLastMonth.diff(startOfLastMonth, "day");
    const daysInThisMonth = dayjs().diff(startOfThisMonth, "day") + 1;

    const getMonthlyViews = async (start, days) => {
      const result = [];
      for (let i = 0; i < days; i++) {
        const date = start.add(i, "day");
        const views = await prisma.articleView.count({
          where: {
            viewedAt: {
              gte: date.toDate(),
              lt: date.add(1, "day").toDate(),
            },
          },
        });
        result.push({
          date: date.format("YYYY-MM-DD"),
          views,
        });
      }
      return result;
    };

    const lastMonthViewsTrend = await getMonthlyViews(
      startOfLastMonth,
      daysInLastMonth
    );
    const thisMonthViewsTrend = await getMonthlyViews(
      startOfThisMonth,
      daysInThisMonth
    );

    const pageViewTrends = {
      lastMonth: lastMonthViewsTrend,
      thisMonth: thisMonthViewsTrend,
    };

    // --- Recent Articles ---
    const recentArticlesRaw = await prisma.article.findMany({
      where: { publishedAt: { not: null }, summaryEnglish: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: 4,
      select: {
        summaryEnglish: true,
        viewCount: true,
        publishedAt: true,
        status: true,
      },
    });

    const recentArticles = recentArticlesRaw.map((article) => ({
      title: article.summaryEnglish,
      views: article.viewCount,
      publishedAt: article.publishedAt.toISOString(),
      status: article.status ? "Published" : "Draft",
    }));

    return {
      overview,
      systemStatus,
      articlePublishingTrends,
      pageViewTrends,
      recentArticles,
    };
  }
}

export default new DashboardService();
