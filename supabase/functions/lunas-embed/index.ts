/// <reference path="../deno.d.ts" />
// ============================================================
// lunas-embed — embed / re-embed knowledge_chunks
// ------------------------------------------------------------
// POST /functions/v1/lunas-embed
// Authorization: Bearer <service role or staff JWT>
// Body: { document_id?: string, force?: boolean }
//
// Secrets:
//   LUNAS_EMBEDDING_PRIMARY_API_KEY=REPLACE_ME_EMBEDDING_PRIMARY_API_KEY
//   LUNAS_EMBEDDING_PRIMARY_MODEL=REPLACE_ME_EMBEDDING_PRIMARY_MODEL
//   LUNAS_EMBEDDING_FAILOVER_API_KEY=REPLACE_ME_EMBEDDING_FAILOVER_API_KEY
//   LUNAS_EMBEDDING_FAILOVER_MODEL=REPLACE_ME_EMBEDDING_FAILOVER_MODEL
//
// Deploy: supabase functions deploy lunas-embed
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function fail(status: number, message: string): Response {
  console.error(`[lunas-embed] FAIL (${status}): ${message}`);
  return json({ error: message }, status);
}

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const v = value.trim();
  return !v || v.startsWith('REPLACE_ME_');
}

function env(name: string): string | undefined {
  const v = Deno.env.get(name);
  return isPlaceholder(v) ? undefined : v;
}

function firstStringValue(values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === 'string' && v) return v;
  }
  return undefined;
}

/** Collect every known project secret key (legacy JWT + new sb_secret_* forms). */
function getAllServiceRoleKeys(): string[] {
  const keys = new Set<string>();
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) keys.add(legacy.trim());

  const raw = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const v of Object.values(parsed as Record<string, unknown>)) {
          if (typeof v === 'string' && v.trim()) keys.add(v.trim());
        }
      }
    } catch {
      // ignore malformed JSON
    }
  }
  return [...keys];
}

function getServiceRoleKey(): string | undefined {
  return getAllServiceRoleKeys()[0];
}

/** True if the bearer token is a project secret/service_role credential. */
function isServiceRoleToken(token: string): boolean {
  const trimmed = token.trim();
  if (!trimmed) return false;
  if (getAllServiceRoleKeys().includes(trimmed)) return true;

  // Legacy JWT service_role: decode payload without verifying signature.
  const parts = trimmed.split('.');
  if (parts.length === 3) {
    try {
      const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(json) as { role?: string };
      if (payload.role === 'service_role') return true;
    } catch {
      // not a JWT / not service role
    }
  }

  // New secret key prefix
  if (trimmed.startsWith('sb_secret_')) return true;

  return false;
}

type EmbedCfg = {
  apiKey: string;
  baseUrl: string;
  model: string;
  kind: string;
  dimensions: number;
};

function embeddingDimensions(): number {
  const raw = env('LUNAS_EMBEDDING_DIMENSIONS');
  const n = raw ? Number(raw) : 1536;
  return Number.isFinite(n) && n > 0 ? n : 1536;
}

function getPrimaryEmbed(): EmbedCfg | null {
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

function getFailoverEmbed(): EmbedCfg | null {
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

async function embedText(cfg: EmbedCfg, input: string): Promise<number[]> {
  const res = await fetch(`${cfg.baseUrl}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: cfg.model,
      input,
      dimensions: cfg.dimensions,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${cfg.kind} embed HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  const raw = await res.json();
  const vector = raw?.data?.[0]?.embedding as number[] | undefined;
  if (!vector?.length) throw new Error(`${cfg.kind} embed returned empty vector`);
  if (vector.length !== cfg.dimensions) {
    throw new Error(`${cfg.kind} embed returned ${vector.length} dims; expected ${cfg.dimensions}`);
  }
  return vector;
}

async function embedWithFailover(input: string): Promise<{ vector: number[]; kind: string }> {
  const primary = getPrimaryEmbed();
  const failover = getFailoverEmbed();
  if (!primary && !failover) throw new Error('NO_EMBED_CONFIG');

  if (primary) {
    try {
      return { vector: await embedText(primary, input), kind: 'primary' };
    } catch (e) {
      console.warn('[lunas-embed] primary failed:', (e as Error).message);
      if (!failover) throw e;
    }
  }
  return { vector: await embedText(failover!, input), kind: 'failover' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') return fail(405, 'Method not allowed');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = getServiceRoleKey();
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !serviceKey) {
      return fail(500, 'Service role environment is not configured.');
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const apiKeyHeader = req.headers.get('apikey') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return fail(401, 'Missing Authorization bearer token.');

    // Allow service role / secret key (Authorization or apikey), or staff JWT.
    const isServiceCall =
      isServiceRoleToken(token) || (apiKeyHeader ? isServiceRoleToken(apiKeyHeader) : false);

    if (!isServiceCall) {
      const userClient = createClient(supabaseUrl, anonKey ?? serviceKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: userData, error: userError } = await userClient.auth.getUser(token);
      if (userError || !userData.user) {
        return fail(
          401,
          'Invalid session. Use the service_role secret key (Project Settings → API), not the anon key, and keep the Bearer prefix.',
        );
      }

      const adminCheck = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data: profile } = await adminCheck
        .from('profiles')
        .select('role:roles!profiles_role_id_fkey(name)')
        .eq('id', userData.user.id)
        .maybeSingle();
      const roleName = (profile?.role as { name?: string } | null)?.name;
      if (roleName !== 'staff' && roleName !== 'super_admin') {
        return fail(403, 'Only staff or super_admin can run embedding jobs.');
      }
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const body = await req.json().catch(() => ({}));
    const documentId = typeof body.document_id === 'string' ? body.document_id : null;
    const force = Boolean(body.force);

    let query = admin
      .from('knowledge_chunks')
      .select('id, content, embedding, document_id')
      .order('created_at', { ascending: true })
      .limit(200);

    if (documentId) query = query.eq('document_id', documentId);
    if (!force) query = query.is('embedding', null);

    const { data: chunks, error } = await query;
    if (error) return fail(500, error.message);

    if (!chunks?.length) {
      return json({ updated: 0, message: 'No chunks needing embeddings.' });
    }

    let updated = 0;
    let provider = 'primary';
    const errors: string[] = [];

    for (const chunk of chunks) {
      try {
        const { vector, kind } = await embedWithFailover(String(chunk.content).slice(0, 8000));
        provider = kind;
        const { error: upErr } = await admin
          .from('knowledge_chunks')
          .update({ embedding: vector })
          .eq('id', chunk.id);
        if (upErr) {
          errors.push(`${chunk.id}: ${upErr.message}`);
        } else {
          updated += 1;
        }
      } catch (e) {
        errors.push(`${chunk.id}: ${(e as Error).message}`);
      }
    }

    return json({
      updated,
      attempted: chunks.length,
      provider,
      errors: errors.length ? errors.slice(0, 10) : undefined,
    });
  } catch (e) {
    if ((e as Error).message === 'NO_EMBED_CONFIG') {
      return fail(
        503,
        'Embedding API keys are not configured. Set LUNAS_EMBEDDING_PRIMARY_API_KEY (and optional failover).',
      );
    }
    console.error('[lunas-embed] unexpected:', e);
    return fail(500, (e as Error).message || 'Unexpected error');
  }
});
