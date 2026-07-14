# Messages Page Documentation

## Overview

The Messages page has been successfully implemented for the BKWB (Barangay Kalunasan Water Billing and Information System) Staff Desktop Application. This page allows barangay water billing staff to communicate with residents regarding billing concerns, complaints, payment verification, and service inquiries.

## Features Implemented

### 1. **Three-Panel Layout**

#### Left Panel - Conversation List (350px width)
- **Search Bar**: Search residents by name or account number
- **Tabs**: 
  - "All" - Shows all conversations
  - "Unread" - Filters to show only unread conversations
- **Conversation Cards**: Each card displays:
  - Resident avatar with initials
  - Resident name
  - Last message preview (truncated)
  - Timestamp
  - Category badge (Billing Concern, Complaint, Inquiry, Payment Concern)
  - Unread count badge (if applicable)
- **Active State**: Selected conversation highlighted with blue left border and light background

#### Right Panel - Chat Interface
**Header Section**:
- Resident avatar with initials
- Resident name
- Account number
- Online/offline status indicator
- "View Profile" button
- More options menu (three dots)

**Messages Area**:
- Date divider (e.g., "OCTOBER 24, 2023")
- Scrollable message history
- **Resident Messages**: Left-aligned, white background, gray border
- **Staff Messages**: Right-aligned, blue background, white text
- Message timestamps
- Read status indicators
- Support for images and attachments

**Quick Reply Section**:
- Pre-defined quick reply chips:
  - "Technical check scheduled"
  - "Payment confirmed"
  - "Verification needed"
- "Assign Tag" button for message categorization

**Message Composer**:
- Attachment button (paperclip icon)
- Emoji button
- Image upload button
- Text input field with placeholder "Type your message here..."
- Send button (blue, with arrow icon)
- Enter key support for sending messages

### 2. **TypeScript Interfaces**

New interfaces added to `src/types/index.ts`:

```typescript
interface Message {
  id: string;
  text: string;
  senderId: string;
  senderType: 'resident' | 'staff';
  timestamp: string;
  read: boolean;
  imageUrl?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

interface Conversation {
  id: string;
  residentId: string;
  residentName: string;
  residentAvatar?: string;
  residentInitials: string;
  accountNo: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  category: 'billing' | 'complaint' | 'inquiry' | 'payment' | 'technical';
  status: 'online' | 'offline';
  messages: Message[];
}
```

### 3. **Components Created**

#### `ConversationCard.tsx`
- Displays individual conversation in the list
- Shows category badge with color coding:
  - **Billing**: Blue
  - **Complaint**: Red
  - **Inquiry**: Purple
  - **Payment**: Green
  - **Technical**: Orange
- Handles active state styling
- Shows unread count badge

#### `MessageBubble.tsx`
- Renders individual messages
- Different styling for resident vs staff messages
- Supports text, images, and attachments
- Shows timestamp and read status
- Avatar display for resident messages

### 4. **Mock Data**

File: `src/data/mockMessages.ts`

Contains 5 realistic conversation examples:

1. **Elena Rodriguez** - Billing Concern
   - Discussing high water bill
   - Includes meter photo attachment
   - 3 unread messages
   - Online status

2. **Mark Jayson Sy** - Inquiry
   - Meter check scheduling
   - Completed conversation
   - Offline status

3. **Victoria Blanco** - Complaint
   - Low water pressure issue
   - 1 unread message
   - Offline status

4. **Ricardo Go** - Payment Concern
   - GCash payment confirmation
   - All messages read
   - Offline status

5. **Ana Batungbakal** - Inquiry
   - Scheduled maintenance question
   - Completed conversation
   - Offline status

### 5. **Styling & Design**

- **Colors**:
  - Primary Blue: `#2563eb` (bg-blue-600)
  - Light Blue: `#dbeafe` (bg-blue-50)
  - White backgrounds for cards
  - Gray borders: `#e5e7eb`
  
- **Spacing**:
  - Consistent padding: 16px (p-4)
  - Card gaps: 24px (gap-6)
  - Message bubbles: max 70% width
  
- **Typography**:
  - Headlines: font-semibold, text-lg
  - Body text: text-sm
  - Labels: text-xs, uppercase
  
- **Transitions**:
  - Smooth hover effects on cards and buttons
  - Color transitions: 200ms

## File Structure

```
desktop-app/staff/src/
├── components/
│   ├── ConversationCard.tsx      # NEW - Conversation list item
│   └── MessageBubble.tsx          # NEW - Individual message display
├── data/
│   └── mockMessages.ts            # NEW - Mock conversation data
├── pages/
│   └── Messages.tsx               # NEW - Main messages page
└── types/
    └── index.ts                   # UPDATED - Added Message types
```

## Usage

The Messages page is now integrated into the main application. To access it:

1. Run the development server: `npm run dev`
2. Navigate to the Messages menu item in the sidebar
3. The page will load with mock conversations
4. Click on any conversation to view the chat
5. Type a message and press Enter or click Send

## Responsive Design

- Fixed width left panel (350px)
- Flexible right panel adapts to remaining space
- Scrollable conversation list and message area
- Desktop-optimized for Electron application

## Future Enhancements

The following features are prepared for future backend integration:

1. **Real-time messaging** with WebSocket/Supabase Realtime
2. **Message sending** functionality (currently logs to console)
3. **File upload** handling for images and attachments
4. **Message read receipts** sync
5. **Online status** real-time updates
6. **Search functionality** across message content
7. **Message filtering** by category
8. **Tag assignment** for message organization
9. **Push notifications** for new messages
10. **Message history** pagination

## Development Server

The dev server is currently running at: `http://localhost:5173/`

Access the application in your browser or through the Electron desktop app.

## Notes

- All functionality currently uses mock data
- No Supabase connection yet (as requested)
- UI matches the prototype design closely
- Ready for backend integration when needed
- All components are reusable and well-typed
- Clean, maintainable code structure

## Screenshots Reference

The implementation closely follows the attached prototype screenshot with:
- Three-column layout
- Blue accent colors
- Category badges
- Status indicators
- Quick reply chips
- Modern, clean design aesthetic
