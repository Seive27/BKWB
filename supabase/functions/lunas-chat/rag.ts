/// <reference path="../deno.d.ts" />
// Hybrid RAG retrieval (vector + FTS via match_knowledge_chunks)

import { embedWithFailover } from './llm.ts';
import type { KnowledgeChunk } from './types.ts';

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

export type RetrievalResult = {
  chunks: KnowledgeChunk[];
  mode: 'hybrid' | 'fts_only' | 'none';
};

export type RetrieveOptions = {
  /** When false (default), skip query embedding — FTS only (fast, low memory). */
  useQueryEmbedding?: boolean;
  matchCount?: number;
};

function isGreetingOrTiny(queryText: string): boolean {
  const trimmed = queryText.trim();
  if (trimmed.length < 3) return true;
  return /^(hi|hello|hey|yo|ok|okay|thanks|thank you|good morning|good afternoon|good evening)[\s!.?]*$/i.test(
    trimmed,
  );
}

function queryEmbedEnabled(options?: RetrieveOptions): boolean {
  if (options?.useQueryEmbedding === false) return false;
  if (options?.useQueryEmbedding === true) return true;
  const flag = (Deno.env.get('LUNAS_ENABLE_QUERY_EMBED') ?? '').trim().toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'yes';
}

export async function retrieveKnowledge(
  admin: SupabaseClient,
  queryText: string,
  options?: RetrieveOptions,
): Promise<RetrievalResult> {
  const trimmed = queryText.trim();

  // Skip RAG for greetings / tiny inputs — embeddings would return unrelated chunks.
  if (isGreetingOrTiny(trimmed)) {
    return { chunks: [], mode: 'none' };
  }

  const matchCount = options?.matchCount ?? 4;
  let queryEmbedding: number[] | null = null;

  if (queryEmbedEnabled(options)) {
    const embedded = await embedWithFailover(trimmed.slice(0, 4000));
    queryEmbedding = embedded?.vector ?? null;
  }

  const { data, error } = await admin.rpc('match_knowledge_chunks', {
    query_text: trimmed,
    query_embedding: queryEmbedding,
    match_count: matchCount,
    filter_audience: 'resident',
  });

  if (error) {
    console.warn('[lunas-chat] match_knowledge_chunks error:', error.message);
    const tokens = trimmed.split(/\s+/).filter((t) => t.length > 2).slice(0, 3);
    const pattern = tokens.length ? `%${tokens.join('%')}%` : `%${trimmed.slice(0, 24)}%`;
    const { data: fallback } = await admin
      .from('knowledge_chunks')
      .select('id, document_id, content, knowledge_documents!inner(title, category, audience, is_active)')
      .eq('knowledge_documents.is_active', true)
      .in('knowledge_documents.audience', ['resident', 'all'])
      .ilike('content', pattern)
      .limit(4);

    const chunks: KnowledgeChunk[] = (fallback ?? []).map((row: Record<string, unknown>) => {
      const doc = row.knowledge_documents as { title?: string; category?: string } | null;
      return {
        chunk_id: String(row.id),
        document_id: String(row.document_id),
        title: doc?.title ?? 'Knowledge',
        category: doc?.category ?? 'general',
        content: String(row.content ?? ''),
        similarity: null,
        fts_rank: null,
        combined_score: null,
      };
    });
    return { chunks, mode: chunks.length ? 'fts_only' : 'none' };
  }

  // Drop weak semantic-only matches (common for short / off-topic queries).
  const rawChunks = (data ?? []) as KnowledgeChunk[];
  const chunks = rawChunks.filter((c) => {
    const score = Number(c.combined_score ?? 0);
    const fts = Number(c.fts_rank ?? 0);
    const sim = Number(c.similarity ?? 0);
    if (fts > 0.05) return true;
    if (queryEmbedding && sim >= 0.55) return true;
    if (score >= 0.2) return true;
    return false;
  });

  const mode = queryEmbedding
    ? 'hybrid'
    : chunks.length
      ? 'fts_only'
      : 'none';
  return { chunks, mode };
}

export function formatKnowledgeContext(chunks: KnowledgeChunk[]): string {
  if (!chunks.length) return 'No curated knowledge chunks matched this question.';
  return chunks
    .map(
      (c, i) =>
        `[KB ${i + 1}] ${c.title} (${c.category})\n${c.content}`,
    )
    .join('\n\n');
}
