/// <reference path="../deno.d.ts" />
// Shared types for Lunas Edge Functions

export type LunasAction = {
  type: 'navigate' | 'create_ticket';
  label: string;
  screen?: string;
  params?: Record<string, string>;
};

export type LunasSource = {
  type: 'knowledge' | 'bill' | 'ticket' | 'announcement' | 'system_setting' | 'schedule';
  id?: string;
  title?: string;
};

export type LunasResponse = {
  message: string;
  actions?: LunasAction[];
  suggestions?: string[];
  sources?: LunasSource[];
  meta?: {
    llm_provider?: 'primary' | 'failover' | 'heuristic';
    retrieval_mode?: 'hybrid' | 'fts_only' | 'none';
  };
};

export type ChatTurn = {
  role: 'user' | 'assistant';
  content: string;
};

export type KnowledgeChunk = {
  chunk_id: string;
  document_id: string;
  title: string;
  category: string;
  content: string;
  similarity: number | null;
  fts_rank: number | null;
  combined_score: number | null;
};

export type ProviderKind = 'primary' | 'failover';
