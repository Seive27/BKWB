export type ChatSender = 'user' | 'bot';

export type LunasNavigateScreen =
  | 'Bills'
  | 'Tickets'
  | 'CreateTicket'
  | 'Announcements'
  | 'WaterSchedule';

export type LunasAction = {
  type: 'navigate' | 'create_ticket';
  label: string;
  screen?: LunasNavigateScreen | string;
  params?: Record<string, string>;
};

export type LunasSource = {
  type: 'knowledge' | 'bill' | 'ticket' | 'announcement' | 'system_setting' | 'schedule';
  id?: string;
  title?: string;
};

export type LunasResponse = {
  message: string;
  actions?: LunasAction[];
  suggestions?: string[];
  sources?: LunasSource[];
  meta?: {
    llm_provider?: 'primary' | 'failover' | 'heuristic';
    retrieval_mode?: 'hybrid' | 'fts_only' | 'none';
  };
};

export type ChatMessage = {
  id: string;
  sender: ChatSender;
  text: string;
  createdAt: Date;
  /** When true, render the "Tap to attach photos" card under the bot message. */
  showAttachCard?: boolean;
  seen?: boolean;
  actions?: LunasAction[];
  suggestions?: string[];
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  showAttachCard?: boolean;
  navigateScreen?: LunasNavigateScreen;
  navigateLabel?: string;
};

/** Local offline FAQ — stable policy only; never invent live bill/ticket data. */
export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'current-bill',
    question: 'How much is my bill?',
    answer:
      'Lunas loads your current bill from your account when you are online. Open Billing to see the amount due, due date, and status.',
    navigateScreen: 'Bills',
    navigateLabel: 'View Bills',
  },
  {
    id: 'my-tickets',
    question: 'Show my tickets',
    answer:
      'Lunas lists your service tickets from your account when you are online. Open Reports / Tickets to track status, or file a new concern.',
    navigateScreen: 'Tickets',
    navigateLabel: 'My Tickets',
  },
  {
    id: 'announcements',
    question: 'Any announcements?',
    answer:
      'Lunas reads published resident announcements when you are online. Open Announcements in the app for the latest notices, including interruptions and maintenance.',
    navigateScreen: 'Announcements',
    navigateLabel: 'Announcements',
  },
  {
    id: 'high-bill',
    question: 'Why is my bill high?',
    answer:
      'A higher bill can come from increased usage, a leak, or a meter reading update. Compare current and previous readings in Billing History. For your exact amounts, ask Lunas while online so it can load your live bill.',
    navigateScreen: 'Bills',
    navigateLabel: 'View Bills',
  },
];

export const DEFAULT_BOT_REPLY =
  "Thanks for your message! I'm Lunas, your barangay assistant. Ask about your bill, tickets, announcements, or why a bill looks high.";

export function findOfflineFaqMatch(text: string): FaqItem | undefined {
  const normalized = text.trim().toLowerCase();
  return FAQ_ITEMS.find(
    (item) =>
      item.question.toLowerCase() === normalized ||
      normalized.includes(item.question.toLowerCase().replace('?', '')),
  );
}
