import type { Payment } from '../types';

export async function getPayments(): Promise<Payment[]> {
  return [];
}

export async function recordPayment(_payment: Omit<Payment, 'id'>): Promise<Payment | null> {
  return null;
}

export async function verifyPayment(_id: string): Promise<void> {}
