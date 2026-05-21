/**
 * Multi-provider AI abstraction.
 *
 * Supports:
 *   - anthropic_foundry: Claude via Azure AI Foundry (API key or Entra ID auth)
 *   - claude:            Direct Anthropic API
 *   - openai:            OpenAI API
 *   - ollama:            Local Ollama instance
 *
 * Selected by AI_PROVIDER env var. Model selected by tier (complex/standard/simple).
 */

import Anthropic from '@anthropic-ai/sdk'

// ============================================
// Types
// ============================================

export type ModelTier = 'complex' | 'standard' | 'simple'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ChatMessageContent[]
}

export interface ChatMessageContent {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

export interface ChatOptions {
  temperature?: number
  maxTokens?: number
  tier?: ModelTier
}

export interface ChatResponse {
  content: string
  model: string
  usage?: { inputTokens: number; outputTokens: number }
}

// ============================================
// Model Resolution
// ============================================

function getModelForTier(tier: ModelTier): string {
  switch (tier) {
    case 'complex':
      return process.env.AI_MODEL_COMPLEX || 'claude-opus-4-6'
    case 'standard':
      return process.env.AI_MODEL_STANDARD || 'claude-sonnet-4-5'
    case 'simple':
      return process.env.AI_MODEL_SIMPLE || 'claude-haiku-4-5'
  }
}

function getFallbackModel(): string {
  return (
    process.env.AZURE_AI_FOUNDRY_FALLBACK_MODEL || 'claude-opus-4-5'
  )
}

// ============================================
// Provider Implementations
// ============================================

/**
 * Azure AI Foundry with Claude — uses the Anthropic SDK.
 *
 * Auth priority:
 *   1. API key (AZURE_AI_FOUNDRY_API_KEY) — simplest, works everywhere
 *   2. DefaultAzureCredential fallback — Managed Identity (prod) or az login (dev)
 */
async function callAzureFoundry(
  messages: ChatMessage[],
  options: ChatOptions
): Promise<ChatResponse> {
  const endpoint = process.env.AZURE_AI_FOUNDRY_ENDPOINT
  if (!endpoint) {
    throw new Error(
      'AZURE_AI_FOUNDRY_ENDPOINT is required for anthropic_foundry provider. ' +
      'Set it to your Azure AI Foundry Anthropic endpoint (e.g., https://your-resource.services.ai.azure.com/anthropic)'
    )
  }

  // Resolve API key: explicit key first, then Entra ID fallback
  let apiKey = process.env.AZURE_AI_FOUNDRY_API_KEY
  if (!apiKey) {
    console.info('[AI] No AZURE_AI_FOUNDRY_API_KEY set — falling back to DefaultAzureCredential')
    const { DefaultAzureCredential } = await import('@azure/identity')
    const credential = new DefaultAzureCredential()
    const tokenResponse = await credential.getToken(
      'https://cognitiveservices.azure.com/.default'
    )
    apiKey = tokenResponse.token
  }

  const model = getModelForTier(options.tier || 'standard')

  // Separate system message from conversation
  const systemMsg = messages.find((m) => m.role === 'system')
  const nonSystemMsgs = messages.filter((m) => m.role !== 'system')

  const client = new Anthropic({
    apiKey,
    baseURL: endpoint,
  })

  try {
    const response = await client.messages.create({
      model,
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.3,
      system: systemMsg
        ? (typeof systemMsg.content === 'string' ? systemMsg.content : '')
        : undefined,
      messages: nonSystemMsgs.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: typeof m.content === 'string' ? m.content : m.content.map(c => c.text || '').join(''),
      })),
    })

    const content = response.content?.[0]?.type === 'text'
      ? response.content[0].text
      : ''

    return {
      content,
      model,
      usage: response.usage
        ? {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          }
        : undefined,
    }
  } catch (err: unknown) {
    // Try fallback model on failure
    if (options.tier) {
      const fallbackModel = getFallbackModel()
      console.warn(
        `[AI] Primary model ${model} failed, trying fallback ${fallbackModel}:`,
        err instanceof Error ? err.message : err
      )
      try {
        const response = await client.messages.create({
          model: fallbackModel,
          max_tokens: options.maxTokens ?? 4096,
          temperature: options.temperature ?? 0.3,
          system: systemMsg
            ? (typeof systemMsg.content === 'string' ? systemMsg.content : '')
            : undefined,
          messages: nonSystemMsgs.map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: typeof m.content === 'string' ? m.content : m.content.map(c => c.text || '').join(''),
          })),
        })

        const content = response.content?.[0]?.type === 'text'
          ? response.content[0].text
          : ''

        return {
          content,
          model: fallbackModel,
          usage: response.usage
            ? {
                inputTokens: response.usage.input_tokens,
                outputTokens: response.usage.output_tokens,
              }
            : undefined,
        }
      } catch {
        // Fallback also failed — throw the original error
      }
    }
    throw err
  }
}

async function callClaude(
  messages: ChatMessage[],
  options: ChatOptions
): Promise<ChatResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is required for claude provider')
  }

  const model = getModelForTier(options.tier || 'standard')

  // Separate system message from conversation
  const systemMsg = messages.find((m) => m.role === 'system')
  const nonSystemMsgs = messages.filter((m) => m.role !== 'system')

  const body: Record<string, unknown> = {
    model,
    max_tokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.3,
    messages: nonSystemMsgs.map((m) => ({ role: m.role, content: m.content })),
  }

  if (systemMsg) {
    body.system = typeof systemMsg.content === 'string' ? systemMsg.content : ''
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Anthropic API request failed: ${res.status} ${errText}`)
  }

  const data = await res.json()
  const content =
    data.content?.[0]?.type === 'text' ? data.content[0].text : ''

  return {
    content,
    model,
    usage: data.usage
      ? {
          inputTokens: data.usage.input_tokens,
          outputTokens: data.usage.output_tokens,
        }
      : undefined,
  }
}

async function callOpenAI(
  messages: ChatMessage[],
  options: ChatOptions
): Promise<ChatResponse> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for openai provider')
  }

  // Map tier to OpenAI models
  const modelMap: Record<ModelTier, string> = {
    complex: process.env.AI_MODEL_COMPLEX || 'gpt-4o',
    standard: process.env.AI_MODEL_STANDARD || 'gpt-4o-mini',
    simple: process.env.AI_MODEL_SIMPLE || 'gpt-4o-mini',
  }
  const model = modelMap[options.tier || 'standard']

  const body = {
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 4096,
  }

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`OpenAI API request failed: ${res.status} ${errText}`)
  }

  const data = await res.json()
  return {
    content: data.choices[0].message.content,
    model,
    usage: data.usage
      ? {
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
        }
      : undefined,
  }
}

async function callOllama(
  messages: ChatMessage[],
  options: ChatOptions
): Promise<ChatResponse> {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
  const model = process.env.OLLAMA_MODEL || 'llama3'

  const body = {
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    stream: false,
    options: {
      temperature: options.temperature ?? 0.3,
      num_predict: options.maxTokens ?? 4096,
    },
  }

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Ollama request failed: ${res.status} ${errText}`)
  }

  const data = await res.json()
  return {
    content: data.message?.content || '',
    model,
  }
}

// ============================================
// Public API
// ============================================

export type AIProvider = 'anthropic_foundry' | 'claude' | 'openai' | 'ollama'

function getProvider(): AIProvider {
  return (process.env.AI_PROVIDER || 'anthropic_foundry') as AIProvider
}

/**
 * Send a chat completion request to the configured AI provider.
 */
export async function chat(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<ChatResponse> {
  const provider = getProvider()

  switch (provider) {
    case 'anthropic_foundry':
      return callAzureFoundry(messages, options)
    case 'claude':
      return callClaude(messages, options)
    case 'openai':
      return callOpenAI(messages, options)
    case 'ollama':
      return callOllama(messages, options)
    default:
      throw new Error(`Unknown AI_PROVIDER: ${provider}`)
  }
}

/**
 * Convenience: send system + user prompt, get text back.
 */
export async function complete(
  systemPrompt: string,
  userPrompt: string,
  options: ChatOptions = {}
): Promise<string> {
  const response = await chat(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    options
  )
  return response.content
}

/**
 * Convenience: send system + user prompt, get parsed JSON back.
 */
export async function completeJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  options: ChatOptions = {}
): Promise<T> {
  const prompt = `${userPrompt}\n\nIMPORTANT: Respond ONLY with valid JSON. Do not include any text before or after the JSON object.`
  const text = await complete(systemPrompt, prompt, options)

  // Extract JSON from markdown code blocks if present
  let jsonStr = text
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1]
  }

  return JSON.parse(jsonStr.trim()) as T
}
