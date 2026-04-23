/**
 * AI Provider Service
 * Manages per-user AI provider configuration (OpenAI, Gemini, Custom).
 * API keys are encrypted at rest using AES-256-GCM.
 */

import crypto from 'crypto';
import prisma from '../../config/database';

// ─── Encryption helpers ───────────────────────────────────────────────────────

const ENCRYPTION_KEY = Buffer.from(
  process.env.AI_KEY_ENCRYPTION_SECRET || 'insightu-ai-key-secret-32-bytes!!',
  'utf8'
).slice(0, 32);

function encryptApiKey(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Format: iv(hex):tag(hex):ciphertext(hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptApiKey(stored: string): string {
  const [ivHex, tagHex, ciphertextHex] = stored.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type AIProviderType = 'OPENAI' | 'GEMINI' | 'CUSTOM';

export interface AIProviderConfigInput {
  provider: AIProviderType;
  apiKey: string;
  baseUrl?: string;
}

export interface AIProviderConfigOutput {
  provider: AIProviderType;
  baseUrl?: string | null;
  hasApiKey: boolean;
  updatedAt: Date;
}

// ─── Service functions ────────────────────────────────────────────────────────

export async function getAIConfig(userId: string): Promise<AIProviderConfigOutput | null> {
  const config = await prisma.aIProviderConfig.findUnique({ where: { userId } });
  if (!config) return null;
  return {
    provider: config.provider as AIProviderType,
    baseUrl: config.baseUrl,
    hasApiKey: !!config.apiKey,
    updatedAt: config.updatedAt,
  };
}

export async function upsertAIConfig(
  userId: string,
  input: AIProviderConfigInput
): Promise<AIProviderConfigOutput> {
  if (input.provider === 'CUSTOM' && !input.baseUrl) {
    throw new Error('baseUrl is required for CUSTOM provider');
  }

  const encryptedKey = encryptApiKey(input.apiKey);

  const config = await prisma.aIProviderConfig.upsert({
    where: { userId },
    create: {
      userId,
      provider: input.provider,
      apiKey: encryptedKey,
      baseUrl: input.baseUrl ?? null,
    },
    update: {
      provider: input.provider,
      apiKey: encryptedKey,
      baseUrl: input.baseUrl ?? null,
    },
  });

  return {
    provider: config.provider as AIProviderType,
    baseUrl: config.baseUrl,
    hasApiKey: true,
    updatedAt: config.updatedAt,
  };
}

/** Returns the decrypted API key for internal use only — never expose to client */
export async function getDecryptedApiKey(userId: string): Promise<{
  provider: AIProviderType;
  apiKey: string;
  baseUrl?: string | null;
} | null> {
  const config = await prisma.aIProviderConfig.findUnique({ where: { userId } });
  if (!config) return null;
  return {
    provider: config.provider as AIProviderType,
    apiKey: decryptApiKey(config.apiKey),
    baseUrl: config.baseUrl,
  };
}
