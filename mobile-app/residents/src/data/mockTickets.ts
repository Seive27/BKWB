import type { Ticket } from '@/types/tickets';

/**
 * Mock tickets for UI development.
 * Later these will be replaced by Supabase queries (tickets table + timeline rows).
 */
export const MOCK_TICKETS: Ticket[] = [
  {
    id: 'tkt-001',
    reference: 'TKT-2026-0102',
    subject: 'Low water pressure in Zone 2',
    category: 'water',
    status: 'in_progress',
    priority: 'high',
    description:
      'Water pressure in our area has been very low for the past 3 days. It barely reaches the second floor of our house, and some neighbors in Purok 3 are experiencing the same problem.',
    createdAt: 'February 8, 2026',
    updatedAt: 'February 10, 2026',
    timeline: [
      {
        id: 'tkt-001-e1',
        type: 'submitted',
        title: 'Request Submitted',
        author: 'You',
        timestamp: 'Feb 8, 2026 · 9:14 AM',
        description:
          'Reported low water pressure affecting Zone 2, Purok 3. Water barely reaches the second floor.',
      },
      {
        id: 'tkt-001-e2',
        type: 'staff_reply',
        title: 'Staff Replied',
        author: 'BKWB Staff',
        timestamp: 'Feb 9, 2026 · 10:02 AM',
        description:
          'Thank you for reporting. A technician has been dispatched to inspect the main line in Zone 2. We will update you once the inspection is complete.',
      },
      {
        id: 'tkt-001-e3',
        type: 'status_change',
        title: 'Status Updated to In Progress',
        author: 'BKWB Staff',
        timestamp: 'Feb 9, 2026 · 10:05 AM',
      },
      {
        id: 'tkt-001-e4',
        type: 'staff_reply',
        title: 'Staff Replied',
        author: 'BKWB Staff',
        timestamp: 'Feb 10, 2026 · 8:47 AM',
        description:
          'The technician found a faulty valve near the main line in Purok 3. Parts have been ordered and repair is scheduled for tomorrow morning.',
      },
    ],
  },
  {
    id: 'tkt-002',
    reference: 'TKT-2026-0098',
    subject: 'Incorrect bill amount for January',
    category: 'billing',
    status: 'open',
    priority: 'medium',
    description:
      'My January 2026 bill shows ₱750.00, but my usual consumption is around ₱420.00. There was no change in household usage, so I believe this is a billing error.',
    createdAt: 'February 11, 2026',
    updatedAt: 'February 11, 2026',
    timeline: [
      {
        id: 'tkt-002-e1',
        type: 'submitted',
        title: 'Request Submitted',
        author: 'You',
        timestamp: 'Feb 11, 2026 · 2:31 PM',
        description: 'Disputing the January 2026 bill amount of ₱750.00.',
      },
    ],
  },
  {
    id: 'tkt-003',
    reference: 'TKT-2026-0087',
    subject: 'Leaking pipe near the water meter',
    category: 'plumbing',
    status: 'resolved',
    priority: 'high',
    description:
      'There is a visible leak on the pipe right next to our water meter. Water is pooling on the sidewalk and wasting a lot of water.',
    createdAt: 'February 3, 2026',
    updatedAt: 'February 6, 2026',
    timeline: [
      {
        id: 'tkt-003-e1',
        type: 'submitted',
        title: 'Request Submitted',
        author: 'You',
        timestamp: 'Feb 3, 2026 · 7:52 AM',
        description: 'Reported a leaking pipe adjacent to the water meter in front of our house.',
      },
      {
        id: 'tkt-003-e2',
        type: 'staff_reply',
        title: 'Staff Replied',
        author: 'BKWB Staff',
        timestamp: 'Feb 3, 2026 · 11:20 AM',
        description:
          'We have logged your report and a maintenance crew will visit your location today.',
      },
      {
        id: 'tkt-003-e3',
        type: 'staff_reply',
        title: 'Staff Replied',
        author: 'BKWB Staff',
        timestamp: 'Feb 5, 2026 · 4:38 PM',
        description: 'The leaking pipe has been repaired and the area restored. Please monitor for any further leaks.',
      },
      {
        id: 'tkt-003-e4',
        type: 'resolved',
        title: 'Ticket Resolved',
        author: 'BKWB Staff',
        timestamp: 'Feb 6, 2026 · 9:05 AM',
        description: 'This request has been marked as resolved. Thank you for bringing this to our attention.',
      },
    ],
  },
  {
    id: 'tkt-004',
    reference: 'TKT-2026-0072',
    subject: 'Request for new water connection',
    category: 'other',
    status: 'resolved',
    priority: 'low',
    description:
      'I would like to inquire about the requirements and process for applying for a new water connection for a small sari-sari store.',
    createdAt: 'January 27, 2026',
    updatedAt: 'January 30, 2026',
    timeline: [
      {
        id: 'tkt-004-e1',
        type: 'submitted',
        title: 'Request Submitted',
        author: 'You',
        timestamp: 'Jan 27, 2026 · 10:10 AM',
      },
      {
        id: 'tkt-004-e2',
        type: 'staff_reply',
        title: 'Staff Replied',
        author: 'BKWB Staff',
        timestamp: 'Jan 28, 2026 · 9:44 AM',
        description:
          'You may visit the Barangay Hall (Mon–Fri, 8AM–5PM) with a valid ID and proof of residency to start the application. Requirements are listed at the information desk.',
      },
      {
        id: 'tkt-004-e3',
        type: 'resolved',
        title: 'Ticket Resolved',
        author: 'BKWB Staff',
        timestamp: 'Jan 30, 2026 · 2:15 PM',
        description: 'Inquiry answered. Closing this request.',
      },
    ],
  },
];
