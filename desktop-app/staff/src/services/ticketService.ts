import type { Ticket } from '../types';

export async function getTickets(): Promise<Ticket[]> {
  return [];
}

export async function createTicket(_ticket: Omit<Ticket, 'id' | 'ticketNumber'>): Promise<Ticket | null> {
  return null;
}

export async function updateTicket(_id: string, _updates: Partial<Ticket>): Promise<void> {}
