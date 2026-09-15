import { supabase } from '../lib/supabase';
import type { BillingComponent, BillingConfig } from '../types';

const WATER_RATE_KEY = 'billing.water_rate';
const EXTRA_COMPONENTS_KEY = 'billing.extra_components';

export function getBillingConfigErrorMessage(error: {
  message: string;
  code?: string;
}): string {
  const msg = error.message?.toLowerCase() ?? '';
  const code = error?.code ?? '';

  if (msg.includes('relation') || msg.includes('does not exist') || code === '42P01') {
    return 'Billing settings have not been set up yet. Please run the SQL migration.';
  }
  if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'You do not have permission to configure billing prices.';
  }
  if (msg.includes('network') || msg.includes('fetch')) {
    return 'Network unavailable. Please check your connection and try again.';
  }
  return error.message || 'An unexpected error occurred. Please try again.';
}

function parseNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function parseComponents(value: unknown): BillingComponent[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const category = typeof row.category === 'string' ? row.category.trim() : '';
      const price = parseNumber(row.price);
      const id =
        typeof row.id === 'string' && row.id.length > 0
          ? row.id
          : `component-${index}-${Date.now()}`;
      if (!category) return null;
      return { id, category, price };
    })
    .filter((c): c is BillingComponent => c !== null);
}

/** Load water rate and any extra billing components from system_settings. */
export async function getBillingConfig(): Promise<BillingConfig> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', [WATER_RATE_KEY, EXTRA_COMPONENTS_KEY]);

  if (error) {
    throw new Error(getBillingConfigErrorMessage(error));
  }

  let waterRate = 0;
  let components: BillingComponent[] = [];

  for (const row of data ?? []) {
    if (row.key === WATER_RATE_KEY) {
      waterRate = parseNumber(row.value);
    } else if (row.key === EXTRA_COMPONENTS_KEY) {
      components = parseComponents(row.value);
    }
  }

  return { waterRate, components };
}

/**
 * Persist water rate and extra billing components.
 * Ensures `billing.extra_components` exists (upsert) so staff can add
 * dynamic category/price rows without a separate migration.
 */
export async function saveBillingConfig(config: BillingConfig): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;
  const now = new Date().toISOString();

  const cleanedComponents = config.components
    .map((c) => ({
      id: c.id,
      category: c.category.trim(),
      price: Number.isFinite(c.price) ? c.price : 0,
    }))
    .filter((c) => c.category.length > 0);

  const payload = [
    {
      key: WATER_RATE_KEY,
      value: config.waterRate,
      category: 'billing',
      label: 'Water rate (per cubic meter)',
      description: 'Price of water in Philippine pesos per cubic meter.',
      is_public: false,
      updated_by: userId,
      updated_at: now,
    },
    {
      key: EXTRA_COMPONENTS_KEY,
      value: cleanedComponents,
      category: 'billing',
      label: 'Extra billing components',
      description: 'Additional bill line items with category and price (₱).',
      is_public: false,
      updated_by: userId,
      updated_at: now,
    },
  ];

  const { error } = await supabase
    .from('system_settings')
    .upsert(payload, { onConflict: 'key' });

  if (error) {
    throw new Error(getBillingConfigErrorMessage(error));
  }
}
