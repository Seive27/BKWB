export type ChatSender = 'user' | 'bot';

export type ChatMessage = {
  id: string;
  sender: ChatSender;
  text: string;
  createdAt: Date;
  /** When true, render the "Tap to attach photos" card under the bot message. */
  showAttachCard?: boolean;
  seen?: boolean;
};

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  showAttachCard?: boolean;
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'office-hours',
    question: 'Barangay Office Hours?',
    answer:
      'Our barangay office is open Monday to Friday, 8:00 AM – 5:00 PM. We are closed on weekends and public holidays. For emergencies outside office hours, please use the Tickets feature in the app.',
  },
  {
    id: 'pay-online',
    question: 'How to Pay Online?',
    answer:
      'You can pay your water bill online through the Bills tab. Open your current bill, tap Pay Now, and follow the payment instructions. Keep your receipt for your records.',
  },
  {
    id: 'report-leak',
    question: 'Report a Leak',
    answer:
      "Thank you for reporting this. We've created ticket #KL-882. A team will check it within 24 hours. Yes, please send a photo — that would be very helpful.",
    showAttachCard: true,
  },
  {
    id: 'water-schedule',
    question: 'Water Schedule?',
    answer:
      'You can view your area\'s water schedule under Quick Actions → Water Schedule on the Dashboard. Schedules may change during maintenance — check Announcements for the latest notices.',
  },
  {
    id: 'high-bill',
    question: 'Why is my bill high?',
    answer:
      'A higher bill can come from increased usage, a leak, or a meter reading update. Compare your current and previous readings in Billing History. If something looks wrong, file a billing ticket and our staff will review it.',
  },
];

export const DEFAULT_BOT_REPLY =
  "Thanks for your message! I'm Lunas, your barangay assistant. Try one of the suggested questions below, or ask about office hours, payments, water schedule, or reporting issues.";
