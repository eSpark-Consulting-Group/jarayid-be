// services/openAiKeyService.js
import { prisma } from "../prisma/index.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Get OpenAI API key.
 * 1. Try from database (first record in ApiKey table)
 * 2. Fallback to .env if not found
 */
export async function getOpenAiApiKey() {
  const record = await prisma.apiKey.findFirst();

  if (record?.key) {
    return record.key;
  }

  return process.env.OPENAI_API_KEY || null;
}

/**
 * Save or update OpenAI API key in database
 * @param {string} key - New API key to store
 */
export async function saveOpenAiApiKey(key) {
  if (!key) {
    throw new Error("API key is required");
  }

  const existing = await prisma.apiKey.findFirst();

  if (existing) {
    return prisma.apiKey.update({
      where: { id: existing.id },
      data: { key },
    });
  }

  return prisma.apiKey.create({
    data: { key },
  });
}
