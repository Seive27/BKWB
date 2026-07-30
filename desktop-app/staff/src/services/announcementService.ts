import type { Announcement } from '../types';

export async function getAnnouncements(): Promise<Announcement[]> {
  return [];
}

export async function createAnnouncement(_announcement: Omit<Announcement, 'id'>): Promise<Announcement | null> {
  return null;
}

export async function updateAnnouncement(_id: string, _updates: Partial<Announcement>): Promise<void> {}
