/// <reference path="../deno.d.ts" />
// ============================================================
// lunas-chat — BKWB Resident RAG + tool-calling chatbot
// ------------------------------------------------------------
// POST /functions/v1/lunas-chat
// Authorization: Bearer <resident JWT>
// Body: { message: string, history?: {role,content}[], session_id?: string }
//
// Secrets (set in project secrets):
//   LUNAS_ENABLE_LLM=true           # default on when API keys exist; set false to skip LLM
//   LUNAS_ENABLE_QUERY_EMBED=false  # set true for hybrid RAG (query embedding + FTS)

//   LUNAS_LLM_PRIMARY_API_KEY=REPLACE_ME_LLM_PRIMARY_API_KEY
//   LUNAS_LLM_PRIMARY_BASE_URL=REPLACE_ME_LLM_PRIMARY_BASE_URL
//   LUNAS_LLM_PRIMARY_MODEL=REPLACE_ME_LLM_PRIMARY_MODEL
//   LUNAS_LLM_FAILOVER_API_KEY=REPLACE_ME_LLM_FAILOVER_API_KEY
//   LUNAS_LLM_FAILOVER_BASE_URL=REPLACE_ME_LLM_FAILOVER_BASE_URL
//   LUNAS_LLM_FAILOVER_MODEL=REPLACE_ME_LLM_FAILOVER_MODEL
//   LUNAS_EMBEDDING_PRIMARY_API_KEY=REPLACE_ME_EMBEDDING_PRIMARY_API_KEY
//   LUNAS_EMBEDDING_PRIMARY_MODEL=REPLACE_ME_EMBEDDING_PRIMARY_MODEL
//   LUNAS_EMBEDDING_FAILOVER_API_KEY=REPLACE_ME_EMBEDDING_FAILOVER_API_KEY
//   LUNAS_EMBEDDING_FAILOVER_MODEL=REPLACE_ME_EMBEDDING_FAILOVER_MODEL
//
// Deploy: supabase functions deploy lunas-chat
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

import { chatWithFailover, isLlmEnabled, type ChatMessage } from './llm.ts';
import { LUNAS_SYSTEM_PROMPT, RESPONSE_JSON_INSTRUCTION } from './prompt.ts';
import { formatKnowledgeContext, retrieveKnowledge } from './rag.ts';
import { runInferredTools } from './tools.ts';
import type { ChatTurn, LunasAction, LunasResponse, LunasSource } from './types.ts';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function fail(status: number, message: string): Response {
  console.error(`[lunas-chat] FAIL (${status}): ${message}`);
  return json({ error: message }, status);
}

function firstStringValue(values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v === 'string' && v) return v;
  }
  return undefined;
}

function getServiceRoleKey(): string | undefined {
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const values = parsed as Record<string, unknown>;
        const key = values['default'] ?? firstStringValue(Object.values(values));
        if (typeof key === 'string' && key) return key;
      }
    } catch {
      // fall through
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? undefined;
}

function getAnonKey(): string | undefined {
  const raw = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS');
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const values = parsed as Record<string, unknown>;
        const key = values['default'] ?? firstStringValue(Object.values(values));
        if (typeof key === 'string' && key) return key;
      }
    } catch {
      // fall through
    }
  }
  return Deno.env.get('SUPABASE_ANON_KEY') ?? undefined;
}

function peso(n: number): string {
  return `₱${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function parseJsonResponse(text: string): Partial<LunasResponse> | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as Partial<LunasResponse>;
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1)) as Partial<LunasResponse>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function buildHeuristicReply(
  message: string,
  toolResults: Record<string, unknown>,
  kbText: string,
): LunasResponse {
  const parts: string[] = [];
  const actions: LunasAction[] = [];
  const sources: LunasSource[] = [];
  const m = message.toLowerCase().trim();
  const suggestions = [
    'How much is my bill?',
    'Show my tickets',
    'Any announcements?',
    'Why is my bill high?',
  ];

  // Greetings / small talk — never dump random FAQ chunks
  if (
    /^(hi|hello|hey|yo|good morning|good afternoon|good evening|thanks|thank you|ok|okay)[\s!.?]*$/i.test(
      m,
    )
  ) {
    return {
      message:
        "Hi! I'm Lunas, your Barangay Kalunasan water assistant. I can help with your bill, payments, tickets, water schedule, announcements, or office hours.",
      suggestions,
      meta: { llm_provider: 'heuristic', retrieval_mode: 'none' },
    };
  }

  const current = toolResults.get_current_bill as Record<string, unknown> | undefined;
  const details = toolResults.get_bill_details as Record<string, unknown> | undefined;

  if (current?.has_unpaid_bill) {
    parts.push(
      `Your ${current.billing_period ?? 'current'} water bill is ${peso(Number(current.amount_due) || 0)}` +
        (current.due_date ? ` and is due on ${current.due_date}` : '') +
        `. Its current status is ${current.status}.` +
        (current.consumption != null
          ? ` Recorded consumption was ${current.consumption} units` +
            (current.previous_reading != null && current.current_reading != null
              ? ` (previous reading ${current.previous_reading}, current reading ${current.current_reading}).`
              : '.')
          : ''),
    );
    actions.push({ type: 'navigate', label: 'View Bill', screen: 'Bills' });
    sources.push({ type: 'bill', id: String(current.bill_id), title: String(current.bill_number ?? 'Current bill') });
  } else if (current && current.has_unpaid_bill === false && /bill|owe|due|unpaid/.test(m)) {
    parts.push('I could not find an unpaid or overdue bill on your account right now.');
    actions.push({ type: 'navigate', label: 'View Bills', screen: 'Bills' });
  }

  if (details?.found && /high|why|increase|consumption|reading|bill/.test(m)) {
    const prev = details.previous_consumption;
    const curr = details.consumption;
    if (prev != null && curr != null) {
      parts.push(
        `Your recorded consumption went from ${prev} units in ${details.previous_period ?? 'the previous period'} to ${curr} units in ${details.billing_period ?? 'this period'}.`,
      );
    }
    if (details.previous_reading != null && details.current_reading != null) {
      parts.push(
        `Meter readings: previous ${details.previous_reading}, current ${details.current_reading}.`,
      );
    }
    if (Number(details.penalty) > 0) {
      parts.push(`This bill includes a ${peso(Number(details.penalty))} penalty.`);
    }
    if (/high|leak/.test(m)) {
      parts.push(
        'If your household usage has not changed much, you may want to check for leaks or file a service concern.',
      );
      actions.push({ type: 'navigate', label: 'Report a Leak', screen: 'CreateTicket' });
    }
  }

  const tickets = toolResults.get_my_tickets as { tickets?: Array<Record<string, unknown>> } | undefined;
  if (tickets?.tickets && /ticket|concern|leak|report/.test(m)) {
    if (!tickets.tickets.length) {
      parts.push('You have no open service tickets on file. You can file a concern from Reports / Tickets.');
      actions.push({ type: 'navigate', label: 'File Concern', screen: 'CreateTicket' });
    } else {
      const lines = tickets.tickets
        .slice(0, 3)
        .map((t) => `• ${t.ticket_number} — ${t.subject} (${t.status})`)
        .join('\n');
      parts.push(`Here are your recent tickets:\n${lines}`);
      actions.push({ type: 'navigate', label: 'My Tickets', screen: 'Tickets' });
    }
  }

  const ticketDetails = toolResults.get_ticket_details as Record<string, unknown> | undefined;
  if (ticketDetails?.found) {
    parts.push(
      `Ticket ${ticketDetails.ticket_number} (${ticketDetails.subject}) is currently ${ticketDetails.status}.`,
    );
    actions.push({ type: 'navigate', label: 'My Tickets', screen: 'Tickets' });
    sources.push({
      type: 'ticket',
      id: String(ticketDetails.ticket_id),
      title: String(ticketDetails.ticket_number),
    });
  }

  const payments = toolResults.get_payment_history as { payments?: unknown[] } | undefined;
  if (payments && /payment|paid|gcash|received/.test(m)) {
    if (!payments.payments?.length) {
      parts.push(
        'I do not see recorded payments on your account yet. Payments are verified and recorded by authorized barangay staff — a bill is paid only after BKWB confirms it.',
      );
    } else {
      parts.push(`I found ${payments.payments.length} recorded payment(s) on your account.`);
    }
  }

  const anns = toolResults.get_announcements as { announcements?: Array<Record<string, unknown>> } | undefined;
  if (anns?.announcements && /announce|interruption|notice|news|happening/.test(m)) {
    if (!anns.announcements.length) {
      parts.push('There are no current published announcements for residents.');
    } else {
      const lines = anns.announcements
        .slice(0, 3)
        .map((a) => `• ${a.title}`)
        .join('\n');
      parts.push(`Latest announcements:\n${lines}`);
    }
    actions.push({ type: 'navigate', label: 'Announcements', screen: 'Announcements' });
  }

  const schedule = toolResults.get_water_schedule as { entries?: unknown[]; source?: string } | undefined;
  if (schedule && /schedule|sitio|supply/.test(m)) {
    if (!schedule.entries?.length) {
      parts.push(
        'No water schedule entries were found right now. Check Water Schedule and Announcements in the app for the latest notices.',
      );
    } else {
      parts.push(`I found ${schedule.entries.length} schedule-related entr${schedule.entries.length === 1 ? 'y' : 'ies'}. Open Water Schedule for full details.`);
    }
    actions.push({ type: 'navigate', label: 'Water Schedule', screen: 'WaterSchedule' });
  }

  const info = toolResults.get_barangay_info as Record<string, unknown> | undefined;
  if (info && /office|hours|contact|address/.test(m)) {
    parts.push(
      `${info.barangay_name ?? 'Barangay Kalunasan'} office hours: ${info.office_hours}.` +
        (info.office_address ? ` Address: ${JSON.stringify(info.office_address)}.` : '') +
        (info.contact_number ? ` Contact: ${JSON.stringify(info.contact_number)}.` : ''),
    );
  }

  if (/how to pay|pay online|payment method|can i pay|where can i pay|where to pay/.test(m)) {
    parts.push(
      'BKWB does not require residents to manually mark bills as paid in the app. Use the payment methods accepted by Barangay Kalunasan (Cash, GCash, or Bank where available) and keep any reference number for staff to verify and record.',
    );
    actions.push({ type: 'navigate', label: 'View Bill', screen: 'Bills' });
  }

  // Only use RAG text for substantive policy questions — never for greetings / empty intent
  const looksLikePolicyQuestion =
    /pay|bill|ticket|office|hour|login|password|account|leak|schedule|announcement|penalty|status|how|what|where|when|why/.test(
      m,
    );
  if (!parts.length && looksLikePolicyQuestion && kbText && !kbText.startsWith('No curated')) {
    const firstChunk = kbText.split('\n\n')[0]?.replace(/^\[KB \d+\][^\n]*\n/, '') ?? '';
    if (firstChunk.trim()) parts.push(firstChunk.trim());
  }

  if (!parts.length) {
    parts.push(
      "I'm Lunas, your barangay water assistant. Ask about your bill, payments, tickets, water schedule, announcements, or office hours.",
    );
  }

  const uniqueActions = actions.filter(
    (a, i, arr) => arr.findIndex((x) => x.screen === a.screen && x.label === a.label) === i,
  );

  return {
    message: parts.join('\n\n'),
    actions: uniqueActions.length ? uniqueActions : undefined,
    suggestions,
    sources: sources.length ? sources : undefined,
    meta: { llm_provider: 'heuristic', retrieval_mode: 'fts_only' },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return fail(405, 'Method not allowed');
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = getAnonKey();
    const serviceKey = getServiceRoleKey();
    if (!supabaseUrl || !anonKey) {
      return fail(500, 'Supabase environment is not configured.');
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!jwt) return fail(401, 'Missing Authorization bearer token.');

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser(jwt);
    if (userError || !userData.user) {
      return fail(401, 'Invalid or expired session.');
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) return fail(400, 'message is required');

    const history: ChatTurn[] = Array.isArray(body.history)
      ? body.history
          .filter(
            (h: ChatTurn) =>
              h &&
              (h.role === 'user' || h.role === 'assistant') &&
              typeof h.content === 'string',
          )
          .slice(-4)
      : [];

    const admin = serviceKey
      ? createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
      : userClient;

    // FTS always; hybrid RAG when LUNAS_ENABLE_QUERY_EMBED=true.
    const retrieval = await retrieveKnowledge(admin, message, {
      matchCount: 4,
    });
    const kbText = formatKnowledgeContext(retrieval.chunks);

    const sources: LunasSource[] = retrieval.chunks.map((c) => ({
      type: 'knowledge' as const,
      id: c.document_id,
      title: c.title,
    }));

    const toolResults = await runInferredTools(message, userClient, userId);
    const heuristic = buildHeuristicReply(message, toolResults, kbText);
    heuristic.meta = {
      llm_provider: 'heuristic',
      retrieval_mode: retrieval.mode,
    };
    if (sources.length) {
      heuristic.sources = [...(heuristic.sources ?? []), ...sources];
    }

    if (!isLlmEnabled()) {
      return json(heuristic);
    }

    try {
      const liveJson = JSON.stringify(toolResults);
      const messages: ChatMessage[] = [
        { role: 'system', content: LUNAS_SYSTEM_PROMPT },
        { role: 'system', content: `Curated knowledge context:\n${kbText}` },
        {
          role: 'system',
          content: `Live resident data (authoritative, already fetched):\n${liveJson}`,
        },
        ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
        { role: 'user', content: `${message}\n\n${RESPONSE_JSON_INSTRUCTION}` },
      ];

      const completion = await chatWithFailover(messages, []);
      const finalText = completion.message.content ?? '';
      const parsed = parseJsonResponse(finalText);
      if (!parsed?.message && !finalText) {
        console.warn('[lunas-chat] empty LLM answer; using heuristic');
        return json(heuristic);
      }

      const response: LunasResponse = {
        message:
          (parsed?.message && String(parsed.message)) ||
          heuristic.message,
        actions: Array.isArray(parsed?.actions)
          ? (parsed.actions as LunasAction[])
          : heuristic.actions,
        suggestions: Array.isArray(parsed?.suggestions)
          ? (parsed.suggestions as string[]).slice(0, 4)
          : heuristic.suggestions,
        sources: heuristic.sources,
        meta: {
          llm_provider: completion.provider,
          retrieval_mode: retrieval.mode,
        },
      };

      return json(response);
    } catch (llmErr) {
      console.warn('[lunas-chat] LLM path failed, heuristic fallback:', (llmErr as Error).message);
      return json(heuristic);
    }
  } catch (e) {
    const msg = (e as Error).message ?? 'Unexpected error';
    if (msg === 'NO_LLM_CONFIG') {
      return fail(503, 'Lunas LLM is not configured. Set primary/failover API key secrets.');
    }
    console.error('[lunas-chat] unexpected:', e);
    return fail(
      503,
      'Lunas is temporarily unavailable. Try again shortly, or use offline help in the app.',
    );
  }
});
