import type { Bill } from '../types';

export async function getBills(): Promise<Bill[]> {
  return [];
}

export async function getBillById(_id: string): Promise<Bill | null> {
  return null;
}

export async function generateBill(_bill: Omit<Bill, 'id'>): Promise<Bill | null> {
  return null;
}
