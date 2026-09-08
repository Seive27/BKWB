/// <reference path="../deno.d.ts" />
// RLS-scoped account tools — never accept foreign resident IDs from the model

// deno-lint-ignore no-explicit-any
type SupabaseClient = any;

export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'get_current_bill',
      description: 'Get the resident\'s current unpaid or overdue water bill.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_bill_details',
      description: 'Get details for the current or latest bill: readings, consumption, charges, due date.',
      parameters: {
        type: 'object',
        properties: {
          bill_id: { type: 'string', description: 'Optional bill UUID from a prior tool result' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_billing_history',
      description: 'List recent bills for the authenticated resident.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'integer', description: 'Max bills to return (default 6)' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_payment_history',
      description: 'List recent recorded payments for the resident\'s accounts.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'integer' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_my_tickets',
      description: 'List the resident\'s service tickets.',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'integer' } },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_ticket_details',
      description: 'Get one ticket by ticket_number or id belonging to the resident, including timeline.',
      parameters: {
        type: 'object',
        properties: {
          ticket_number: { type: 'string' },
          ticket_id: { type: 'string' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_announcements',
      description: 'Get current published resident announcements.',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'integer' } },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_water_schedule',
      description: 'Get water schedule / interruption entries (table or announcement categories).',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'integer' } },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_barangay_info',
      description: 'Get public barangay office / contact settings.',
      parameters: { type: 'object', properties: {}, additionalProperties: false },
    },
  },
] as const;

function formatPeriod(period: string | null | undefined): string | null {
  if (!period) return null;
  const m = period.match(/^(\d{4})-(\d{2})$/);
  if (!m) return period;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  if (Number.isNaN(d.getTime())) return period;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

async function loadPublishedAnnouncements(
  userClient: SupabaseClient,
  options: {
    limit: number;
    audiences: string[];
    categories?: string[];
  },
) {
  const now = new Date().toISOString();
  let query = userClient
    .from('announcements')
    .select('id, title, content, category, priority, created_at, expires_at')
    .eq('is_published', true)
    .is('deleted_at', null)
    .in('target_audience', options.audiences)
    .or(
      `and(expires_at.is.null,scheduled_at.is.null),` +
        `and(expires_at.is.null,scheduled_at.lte.${now}),` +
        `and(expires_at.gt.${now},scheduled_at.is.null),` +
        `and(expires_at.gt.${now},scheduled_at.lte.${now})`,
    )
    .order('created_at', { ascending: false })
    .limit(options.limit);

  if (options.categories?.length) {
    query = query.in('category', options.categories);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

function statusLabel(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  const map: Record<string, string> = {
    pending: 'Unpaid',
    unpaid: 'Unpaid',
    overdue: 'Overdue',
    paid: 'Paid',
    void: 'Void',
    open: 'Open',
    acknowledged: 'Acknowledged',
    assigned: 'Assigned',
    scheduled: 'Scheduled',
    in_progress: 'Ongoing',
    work_completed: 'Work Completed',
    resolved: 'Resolved',
    closed: 'Closed',
  };
  return map[status] ?? status;
}

async function loadBills(userClient: SupabaseClient, userId: string, limit = 12) {
  const { data, error } = await userClient
    .from('bills')
    .select(
      'id, bill_number, billing_period, amount_due, amount, status, due_date, previous_reading, current_reading, consumption, water_rate, extra_components, paid_at, created_at',
    )
    .eq('resident_id', userId)
    .is('deleted_at', null)
    .order('billing_period', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function executeTool(
  name: string,
  argsJson: string,
  userClient: SupabaseClient,
  userId: string,
): Promise<unknown> {
  let args: Record<string, unknown> = {};
  try {
    args = argsJson ? JSON.parse(argsJson) : {};
  } catch {
    args = {};
  }

  switch (name) {
    case 'get_current_bill': {
      const bills = await loadBills(userClient, userId, 20);
      const current =
        bills.find((b: { status: string }) => b.status === 'overdue') ??
        bills.find((b: { status: string }) => b.status === 'pending') ??
        null;
      if (!current) {
        return { has_unpaid_bill: false, message: 'No unpaid or overdue bill found.' };
      }
      const amount = Number(current.amount_due ?? current.amount ?? 0);
      return {
        has_unpaid_bill: true,
        bill_id: current.id,
        bill_number: current.bill_number,
        billing_period: formatPeriod(current.billing_period),
        billing_period_raw: current.billing_period,
        amount_due: amount,
        due_date: current.due_date,
        status: statusLabel(current.status),
        previous_reading: current.previous_reading,
        current_reading: current.current_reading,
        consumption: current.consumption,
      };
    }

    case 'get_bill_details': {
      const bills = await loadBills(userClient, userId, 24);
      let bill = args.bill_id
        ? bills.find((b: { id: string }) => b.id === args.bill_id)
        : null;
      if (!bill) {
        bill =
          bills.find((b: { status: string }) => ['pending', 'overdue'].includes(b.status)) ??
          bills[0] ??
          null;
      }
      if (!bill) return { found: false, message: 'No bill found for this account.' };

      const idx = bills.findIndex((b: { id: string }) => b.id === bill.id);
      const previous = idx >= 0 ? bills[idx + 1] : null;
      const extras = Array.isArray(bill.extra_components) ? bill.extra_components : [];
      const penalty = extras
        .filter((c: { category?: string }) => /penalty/i.test(c.category ?? ''))
        .reduce((s: number, c: { price?: number }) => s + (Number(c.price) || 0), 0);
      const additional = extras
        .filter((c: { category?: string }) => !/penalty/i.test(c.category ?? ''))
        .reduce((s: number, c: { price?: number }) => s + (Number(c.price) || 0), 0);
      const total = Number(bill.amount_due ?? bill.amount ?? 0);
      const base = Math.max(0, total - additional - penalty);

      return {
        found: true,
        bill_id: bill.id,
        bill_number: bill.bill_number,
        billing_period: formatPeriod(bill.billing_period),
        status: statusLabel(bill.status),
        due_date: bill.due_date,
        previous_reading: bill.previous_reading,
        current_reading: bill.current_reading,
        consumption: bill.consumption,
        previous_consumption: previous?.consumption ?? null,
        previous_period: formatPeriod(previous?.billing_period),
        water_rate: bill.water_rate,
        base_charge: base,
        additional_charge: additional,
        penalty,
        extra_components: extras,
        total,
      };
    }

    case 'get_billing_history': {
      const limit = Math.min(Number(args.limit) || 6, 12);
      const bills = await loadBills(userClient, userId, limit);
      return {
        bills: bills.map((b: Record<string, unknown>) => ({
          bill_id: b.id,
          bill_number: b.bill_number,
          billing_period: formatPeriod(b.billing_period as string),
          amount_due: Number(b.amount_due ?? b.amount ?? 0),
          status: statusLabel(b.status as string),
          due_date: b.due_date,
          consumption: b.consumption,
        })),
      };
    }

    case 'get_payment_history': {
      const limit = Math.min(Number(args.limit) || 6, 12);
      const { data, error } = await userClient
        .from('payments')
        .select('id, amount, payment_date, status, payment_method, reference_number, bill_id')
        .eq('resident_id', userId)
        .is('deleted_at', null)
        .order('payment_date', { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return {
        payments: (data ?? []).map((p: Record<string, unknown>) => ({
          payment_id: p.id,
          amount: p.amount,
          payment_date: p.payment_date,
          status: p.status,
          payment_method: p.payment_method,
          reference_number: p.reference_number,
          bill_id: p.bill_id,
        })),
      };
    }

    case 'get_my_tickets': {
      const limit = Math.min(Number(args.limit) || 8, 15);
      const { data, error } = await userClient
        .from('tickets')
        .select('id, ticket_number, subject, category, status, priority, created_at, updated_at')
        .eq('resident_id', userId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return {
        tickets: (data ?? []).map((t: Record<string, unknown>) => ({
          ticket_id: t.id,
          ticket_number: t.ticket_number,
          subject: t.subject,
          category: t.category,
          status: statusLabel(t.status as string),
          priority: t.priority,
          created_at: t.created_at,
        })),
      };
    }

    case 'get_ticket_details': {
      let query = userClient
        .from('tickets')
        .select(
          'id, ticket_number, subject, description, category, status, priority, resolution, created_at, updated_at, resolved_at',
        )
        .eq('resident_id', userId)
        .is('deleted_at', null);

      if (typeof args.ticket_id === 'string' && args.ticket_id) {
        query = query.eq('id', args.ticket_id);
      } else if (typeof args.ticket_number === 'string' && args.ticket_number) {
        query = query.eq('ticket_number', args.ticket_number.trim());
      } else {
        return { found: false, message: 'Provide ticket_number or ticket_id.' };
      }

      const { data: ticket, error } = await query.maybeSingle();
      if (error) throw new Error(error.message);
      if (!ticket) return { found: false, message: 'Ticket not found for this account.' };

      const { data: timeline } = await userClient
        .from('ticket_timeline')
        .select('event_type, description, created_at')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: true });

      return {
        found: true,
        ticket_id: ticket.id,
        ticket_number: ticket.ticket_number,
        subject: ticket.subject,
        description: ticket.description,
        category: ticket.category,
        status: statusLabel(ticket.status),
        priority: ticket.priority,
        resolution: ticket.resolution,
        created_at: ticket.created_at,
        timeline: timeline ?? [],
      };
    }

    case 'get_announcements': {
      const limit = Math.min(Number(args.limit) || 5, 10);
      const data = await loadPublishedAnnouncements(userClient, {
        limit,
        audiences: ['all', 'residents'],
      });
      return {
        announcements: (data ?? []).map((a: Record<string, unknown>) => ({
          id: a.id,
          title: a.title,
          content: a.content,
          category: a.category,
          priority: a.priority,
          created_at: a.created_at,
        })),
      };
    }

    case 'get_water_schedule': {
      const limit = Math.min(Number(args.limit) || 8, 15);
      // Resident app water schedule is announcement categories, not water_schedule RLS.
      const ann = await loadPublishedAnnouncements(userClient, {
        limit,
        audiences: ['all', 'residents'],
        categories: ['schedule', 'interruption', 'maintenance'],
      });
      if (ann.length) {
        return { source: 'announcements', entries: ann };
      }

      const { data: scheduleRows, error: scheduleError } = await userClient
        .from('water_schedule')
        .select('id, title, description, affected_area, schedule_date, start_time, end_time, created_at')
        .order('schedule_date', { ascending: false })
        .limit(limit);

      if (scheduleError) {
        return { source: 'none', entries: [], error: scheduleError.message };
      }
      return { source: 'water_schedule', entries: scheduleRows ?? [] };
    }

    case 'get_barangay_info': {
      const { data, error } = await userClient
        .from('system_settings')
        .select('key, value, label, category')
        .eq('is_public', true)
        .in('key', [
          'general.barangay_name',
          'general.office_address',
          'general.contact_number',
          'general.office_email',
        ]);
      if (error) throw new Error(error.message);
      const map: Record<string, unknown> = {};
      for (const row of data ?? []) {
        map[row.key] = row.value;
      }
      return {
        barangay_name: map['general.barangay_name'] ?? 'Barangay Kalunasan',
        office_address: map['general.office_address'] ?? null,
        contact_number: map['general.contact_number'] ?? null,
        office_email: map['general.office_email'] ?? null,
        office_hours: 'Monday to Friday, 8:00 AM – 5:00 PM (closed weekends & public holidays unless announced)',
      };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

export async function runInferredTools(
  message: string,
  userClient: SupabaseClient,
  userId: string,
): Promise<Record<string, unknown>> {
  const toolNames = inferToolNames(message);
  const toolResults: Record<string, unknown> = {};
  await Promise.all(
    toolNames.map(async (name) => {
      const args =
        name === 'get_ticket_details'
          ? JSON.stringify({
              ticket_number: message.match(/TKT-\d{4}-\d+/i)?.[0] ?? undefined,
            })
          : '{}';
      try {
        toolResults[name] = await executeTool(name, args, userClient, userId);
      } catch (e) {
        toolResults[name] = { error: (e as Error).message };
      }
    }),
  );
  return toolResults;
}

/** Keyword heuristic when no LLM API key is configured. */
export function inferToolNames(message: string): string[] {
  const m = message.toLowerCase();
  const tools: string[] = [];

  if (/bill|owe|amount|due|peso|₱|high|consumption|reading|overdue|unpaid|balance|invoice/.test(m)) {
    tools.push('get_current_bill', 'get_bill_details');
  }
  if (/history|previous bill|past bill|old bill/.test(m)) {
    tools.push('get_billing_history');
  }
  if (/payment|paid|gcash|received my payment|receipt/.test(m)) {
    tools.push('get_payment_history');
    if (!tools.includes('get_current_bill')) tools.push('get_current_bill');
  }
  if (/ticket|concern|leak|complaint|report|tkt-|issue/.test(m)) {
    tools.push('get_my_tickets');
    const tkt = m.match(/tkt-\d{4}-\d+/i);
    if (tkt) {
      tools.push('get_ticket_details');
    }
  }
  if (/announce|interruption|notice|advisory|news|what's new|whats new|happening/.test(m)) {
    tools.push('get_announcements');
  }
  if (/schedule|sitio|water schedule|supply hours|no water/.test(m)) {
    tools.push('get_water_schedule');
  }
  if (/office|hours|contact|address|barangay info|phone/.test(m)) {
    tools.push('get_barangay_info');
  }
  if (/how to pay|pay online|payment method/.test(m) && !tools.length) {
    tools.push('get_barangay_info');
  }

  return [...new Set(tools)];
}
