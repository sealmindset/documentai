/**
 * Prompt Management Runtime
 *
 * Loads AI prompts from the database (managed_prompts table).
 * Falls back to the provided default if the prompt is not found or inactive.
 * Prepends the immutable safety preamble to all system prompts.
 */

import prisma from '@/lib/db'
import { SAFETY_PREAMBLE } from '@/lib/ai/safety-preamble'

// In-memory cache (cleared on prompt update via API)
const cache = new Map<string, { content: string; expiresAt: number }>()
const CACHE_TTL_MS = 60_000 // 1 minute

export async function getPrompt(slug: string, fallback: string): Promise<string> {
  // Check cache first
  const cached = cache.get(slug)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.content
  }

  let promptContent = fallback

  try {
    const prompt = await prisma.managedPrompt.findUnique({
      where: { slug },
      select: { content: true, isActive: true, status: true },
    })

    // Only use published prompts (or active prompts without a status field for backwards compat)
    if (prompt && prompt.isActive && (!prompt.status || prompt.status === 'published')) {
      promptContent = prompt.content
    }
  } catch (error) {
    console.warn(`[prompts] Failed to load prompt "${slug}" from DB, using fallback:`, error)
  }

  // Prepend immutable safety preamble -- no code path skips this
  const withPreamble = SAFETY_PREAMBLE + promptContent

  cache.set(slug, { content: withPreamble, expiresAt: Date.now() + CACHE_TTL_MS })
  return withPreamble
}

export function invalidateCache(slug?: string): void {
  if (slug) {
    cache.delete(slug)
  } else {
    cache.clear()
  }
}
