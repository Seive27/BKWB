export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  status: 'success' | 'modified' | 'denied';
}

export async function getAuditLogs(): Promise<AuditLogEntry[]> {
  return [];
}

export async function logAction(_user: string, _action: string, _status: AuditLogEntry['status']): Promise<void> {
  // TODO: Insert audit log to Supabase
}
