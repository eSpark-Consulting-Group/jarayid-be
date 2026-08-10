import prisma from "../prisma/index.js";

/**
 * Fetch the latest OpenAI API key from DB
 * @returns {Promise<string|null>}
 */
export default async function getApiKeyFromDB() {
  try {
    const keyRecord = await prisma.apiKey.findFirst({
      orderBy: { createdAt: "desc" },
    });

    return keyRecord?.key?.trim() || null;
  } catch (error) {
    console.error("❌ Error fetching OpenAI API key from DB:", error);
    return null;
  }
}
