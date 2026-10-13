import type { Payment } from '../types';

export type PaymentChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

type PaymentListener = (event: PaymentChangeEvent, row: Payment | null) => void;

const listeners = new Set<PaymentListener>();

export function subscribePaymentEvents(listener: PaymentListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitPaymentEvent(event: PaymentChangeEvent, row: Payment | null): void {
  listeners.forEach((listener) => {
    listener(event, row);
  });
}
