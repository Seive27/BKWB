/// <reference path="../deno.d.ts" />
// LLM + embedding clients with primary → failover

import type { ProviderKind } from './types.ts';

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const v = value.trim();
  if (!v) return true;
  return v.startsWith('REPLACE_ME_');
}

function env(name: string): string | undefined {
  const v = Deno.env.get(name);
  return isPlaceholder(v) ? undefined : v;
}

export type LlmConfig = {
  kind: ProviderKind;
  apiKey: string;
  baseUrl: string;
  model: string;
};

/** Groq free/dev cannot use Enterprise Llama IDs; Gemini 2.x Flash is retired for new keys. */
const GROQ_RETIRED_MODELS = new Set([
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'llama-3.1-70b-versatile',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
  'gpt-4.1-mini',
]);
const GEMINI_RETIRED_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.5-flash-lite',
  'gpt-4.1-mini',
]);

function resolveChatModel(baseUrl: string, model: string): string {
  const host = baseUrl.toLowerCase();
  const id = model.trim();
  if (host.includes('groq.com') && GROQ_RETIRED_MODELS.has(id)) {
    return 'openai/gpt-oss-20b';
  }
  if (host.includes('generativelanguage.googleapis.com') && GEMINI_RETIRED_MODELS.has(id)) {
    return 'gemini-3.6-flash';
  }
  return id;
}

export function getPrimaryLlm(): LlmConfig | null {
  const apiKey = env('LUNAS_LLM_PRIMARY_API_KEY');
  if (!apiKey) return null;
  const baseUrl = (env('LUNAS_LLM_PRIMARY_BASE_URL') ?? 'https://api.groq.com/openai/v1').replace(/\/$/, '');
  return {
    kind: 'primary',
    apiKey,
    baseUrl,
    model: resolveChatModel(baseUrl, env('LUNAS_LLM_PRIMARY_MODEL') ?? 'openai/gpt-oss-20b'),
  };
}

export function getFailoverLlm(): LlmConfig | null {
  const apiKey = env('LUNAS_LLM_FAILOVER_API_KEY');
  if (!apiKey) return null;
  const baseUrl = (env('LUNAS_LLM_FAILOVER_BASE_URL') ?? 'https://generativelanguage.googleapis.com/v1beta/openai').replace(
    /\/$/,
    '',
  );
  return {
    kind: 'failover',
    apiKey,
    baseUrl,
    model: resolveChatModel(baseUrl, env('LUNAS_LLM_FAILOVER_MODEL') ?? 'gemini-3.6-flash'),
  };
}

export type EmbeddingConfig = {
  kind: ProviderKind;
  apiKey: string;
  baseUrl: string;
  model: string;
  /** Must match knowledge_chunks.embedding vector(N). Default 1536. */
  dimensions: number;
};

function embeddingDimensions(): number {
  const raw = env('LUNAS_EMBEDDING_DIMENSIONS');
  const n = raw ? Number(raw) : 1536;
  return Number.isFinite(n) && n > 0 ? n : 1536;
}

export function getPrimaryEmbedding(): EmbeddingConfig | null {
  // Prefer dedicated embedding secrets — do not fall back to a chat-only provider
  // (e.g. Groq) that cannot serve embeddings.
  const apiKey = env('LUNAS_EMBEDDING_PRIMARY_API_KEY');
  if (!apiKey) return null;
  return {
    kind: 'primary',
    apiKey,
    baseUrl: (
      env('LUNAS_EMBEDDING_PRIMARY_BASE_URL') ??
      env('LUNAS_LLM_FAILOVER_BASE_URL') ??
      'https://api.openai.com/v1'
    ).replace(/\/$/, ''),
    model: env('LUNAS_EMBEDDING_PRIMARY_MODEL') ?? 'text-embedding-3-small',
    dimensions: embeddingDimensions(),
  };
}

export function getFailoverEmbedding(): EmbeddingConfig | null {
  const apiKey = env('LUNAS_EMBEDDING_FAILOVER_API_KEY');
  if (!apiKey) return null;
  return {
    kind: 'failover',
    apiKey,
    baseUrl: (
      env('LUNAS_EMBEDDING_FAILOVER_BASE_URL') ??
      env('LUNAS_EMBEDDING_PRIMARY_BASE_URL') ??
      env('LUNAS_LLM_FAILOVER_BASE_URL') ??
      'https://api.openai.com/v1'
    ).replace(/\/$/, ''),
    model: env('LUNAS_EMBEDDING_FAILOVER_MODEL') ?? 'text-embedding-3-small',
    dimensions: embeddingDimensions(),
  };
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

/** Hard cap so Edge workers do not idle-timeout at 150s. */
const LLM_TIMEOUT_MS = 12_000;
const EMBED_TIMEOUT_MS = 8_000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
};

export type ChatCompletionResult = {
  provider: ProviderKind;
  message: ChatMessage;
  raw: unknown;
};

async function chatOnce(
  cfg: LlmConfig,
  messages: ChatMessage[],
  tools: unknown[],
): Promise<ChatCompletionResult> {
  console.log(`[lunas-chat] ${cfg.kind} model=${cfg.model}`);
  const res = await fetchWithTimeout(
    `${cfg.baseUrl}/chat/completions`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: 0.2,
        max_tokens: 500,
        messages,
        tools: tools.length ? tools : undefined,
        tool_choice: tools.length ? 'auto' : undefined,
      }),
    },
    LLM_TIMEOUT_MS,
  );

  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`LLM ${cfg.kind} HTTP ${res.status}: ${body.slice(0, 400)}`);
    (err as Error & { retryable?: boolean }).retryable = isRetryableStatus(res.status);
    throw err;
  }

  const raw = await res.json();
  const message = raw?.choices?.[0]?.message as ChatMessage | undefined;
  if (!message) throw new Error(`LLM ${cfg.kind} returned no message`);
  return { provider: cfg.kind, message, raw };
}

/** Primary once, then failover once. No long retries (Edge idle budget is tight). */
export async function chatWithFailover(
  messages: ChatMessage[],
  tools: unknown[],
): Promise<ChatCompletionResult> {
  const primary = getPrimaryLlm();
  const failover = getFailoverLlm();

  if (!primary && !failover) {
    throw new Error('NO_LLM_CONFIG');
  }

  if (primary) {
    try {
      return await chatOnce(primary, messages, tools);
    } catch (e1) {
      console.warn('[lunas-chat] primary LLM failed:', (e1 as Error).message);
      if (!failover) throw e1;
    }
  }

  if (!failover) throw new Error('NO_LLM_CONFIG');
  return await chatOnce(failover, messages, tools);
}

async function embedOnce(cfg: EmbeddingConfig, input: string): Promise<number[]> {
  const res = await fetchWithTimeout(
    `${cfg.baseUrl}/embeddings`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: cfg.model,
        input,
        // Keep vectors aligned with knowledge_chunks.embedding vector(1536)
        dimensions: cfg.dimensions,
      }),
    },
    EMBED_TIMEOUT_MS,
  );
  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`Embedding ${cfg.kind} HTTP ${res.status}: ${body.slice(0, 400)}`);
    (err as Error & { retryable?: boolean }).retryable = isRetryableStatus(res.status);
    throw err;
  }
  const raw = await res.json();
  const vector = raw?.data?.[0]?.embedding as number[] | undefined;
  if (!vector?.length) throw new Error(`Embedding ${cfg.kind} returned empty vector`);
  if (vector.length !== cfg.dimensions) {
    throw new Error(
      `Embedding ${cfg.kind} returned ${vector.length} dims; expected ${cfg.dimensions}`,
    );
  }
  return vector;
}

export async function embedWithFailover(input: string): Promise<{ vector: number[]; provider: ProviderKind } | null> {
  const primary = getPrimaryEmbedding();
  const failover = getFailoverEmbedding();
  if (!primary && !failover) return null;

  if (primary) {
    try {
      const vector = await embedOnce(primary, input);
      return { vector, provider: 'primary' };
    } catch (e) {
      console.warn('[lunas-chat] primary embedding failed:', (e as Error).message);
      if (!failover) return null;
    }
  }

  if (!failover) return null;
  try {
    const vector = await embedOnce(failover, input);
    return { vector, provider: 'failover' };
  } catch (e) {
    console.warn('[lunas-chat] failover embedding failed:', (e as Error).message);
    return null;
  }
}

export function hasAnyLlmConfigured(): boolean {
  return !!(getPrimaryLlm() || getFailoverLlm());
}

/**
 * Use the LLM whenever API keys are configured.
 * Set LUNAS_ENABLE_LLM=false only to force the heuristic path.
 */
export function isLlmEnabled(): boolean {
  const flag = (Deno.env.get('LUNAS_ENABLE_LLM') ?? 'true').trim().toLowerCase();
  if (flag === '0' || flag === 'false' || flag === 'no' || flag === 'off') return false;
  return hasAnyLlmConfigured();
}
