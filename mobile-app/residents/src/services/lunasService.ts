import { FunctionsHttpError, FunctionsRelayError, FunctionsFetchError } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import {
  DEFAULT_BOT_REPLY,
  FAQ_ITEMS,
  findOfflineFaqMatch,
  type ChatMessage,
  type LunasAction,
  type LunasResponse,
} from '@/types/chatbot';

export type LunasChatRequest = {
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  sessionId?: string;
};

async function readFunctionsError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body && typeof body === 'object' && 'error' in body) {
        return String((body as { error: unknown }).error);
      }
      return JSON.stringify(body).slice(0, 240);
    } catch {
      try {
        return await error.context.text();
      } catch {
        return error.message;
      }
    }
  }
  if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Lunas is temporarily unavailable.';
}

/**
 * Call the lunas-chat Edge Function with the resident JWT.
 * Throws on transport/auth failures so the UI can fall back to offline FAQ.
 */
export async function askLunas(request: LunasChatRequest): Promise<LunasResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('You must be logged in to chat with Lunas.');
  }

  const { data, error } = await supabase.functions.invoke('lunas-chat', {
    body: {
      message: request.message,
      history: request.history ?? [],
      session_id: request.sessionId,
    },
  });

  if (error) {
    throw new Error(await readFunctionsError(error));
  }

  if (data && typeof data === 'object' && 'error' in data && (data as { error?: string }).error) {
    throw new Error(String((data as { error: string }).error));
  }

  const payload = data as LunasResponse | null;
  if (!payload?.message) {
    throw new Error('Lunas returned an empty response.');
  }

  return {
    message: payload.message,
    actions: Array.isArray(payload.actions) ? payload.actions : undefined,
    suggestions: Array.isArray(payload.suggestions) ? payload.suggestions : undefined,
    sources: Array.isArray(payload.sources) ? payload.sources : undefined,
    meta: payload.meta,
  };
}

/** Offline / error fallback using local FAQ seed (stable policy text only). */
export function offlineLunasReply(message: string): LunasResponse {
  const matched = findOfflineFaqMatch(message);
  if (matched) {
    const actions: LunasAction[] | undefined = matched.navigateScreen
      ? [
          {
            type: 'navigate',
            label: matched.navigateLabel ?? 'Open',
            screen: matched.navigateScreen,
          },
        ]
      : undefined;

    return {
      message: `You're currently offline (or Lunas is unavailable).\n\n${matched.answer}`,
      actions,
      suggestions: FAQ_ITEMS.slice(0, 4).map((f) => f.question),
      meta: { llm_provider: 'heuristic', retrieval_mode: 'none' },
    };
  }

  return {
    message: `You're currently offline (or Lunas is unavailable).\n\n${DEFAULT_BOT_REPLY}`,
    suggestions: FAQ_ITEMS.slice(0, 4).map((f) => f.question),
    meta: { llm_provider: 'heuristic', retrieval_mode: 'none' },
  };
}

export function historyFromMessages(
  messages: ChatMessage[],
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages
    .filter((m) => m.sender === 'user' || m.sender === 'bot')
    .slice(-8)
    .map((m) => ({
      role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.text,
    }));
}
