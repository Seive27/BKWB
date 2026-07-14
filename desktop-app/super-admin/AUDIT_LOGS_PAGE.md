# Audit Logs Page - Super Admin Dashboard

## Overview

The Audit Logs page provides an immutable record of all administrative activities and security events in the BKWB system. It displays comprehensive activity tracking with filtering, search, and export capabilities for compliance and security monitoring.

## File Location

- **Component**: `src/pages/AuditLogs.tsx`
- **Route**: Accessible via Sidebar → "Audit Logs"

## Features Implemented

### 1. **Page Header**
- **Title**: "Audit Logs"
- **Subtitle**: "Immutable record of all administrative activities and security events."
- **Action Buttons** (2 buttons):
  - **Export CSV**: White button with download icon
  - **Live Monitoring**: Blue button with radio icon (for real-time monitoring)

### 2. **Filter Bar** (4 filters in a grid)

#### Date Range Filter
- **Input Type**: Text input with calendar icon
- **Default Value**: "Oct 24 - Oct 31, 2023"
- **Background**: Light blue (blue-50) to indicate active filter
- **Icon**: Calendar icon (blue)
- **Functionality**: Date picker integration ready

#### User Focus Filter
- **Input Type**: Dropdown select
- **Options**:
  - All Administrators (default)
  - Super Admin
  - Staff
  - Meter Readers
- **Background**: White

#### Action Type Filter
- **Input Type**: Dropdown select
- **Options**:
  - Security & Access (default)
  - User Management
  - System Changes
  - Data Operations
- **Background**: White

#### Device/IP Filter
- **Input Type**: Dropdown select with refresh icon
- **Options**:
  - Global Network (default)
  - Local Network
  - External
- **Icon**: Refresh icon (blue)
- **Background**: White

#### Clear All Filters Button
- Located below the filter grid (right-aligned)
- Text: "Clear All Filters"
- Style: Blue text with refresh icon
- Action: Resets all filters to default

### 3. **Audit Logs Table**

#### Table Columns (6 columns)

1. **Timestamp**
   - Calendar icon
   - Date: "Oct 31, 2023"
   - Time: "14:23:16 UTC" (smaller, gray)

2. **User Entity**
   - Avatar circle with initials (blue background)
   - Full Name: Bold text
   - Email: Smaller gray text

3. **Action**
   - Action icon with colored background:
     - **Red**: Password changes (AlertCircle)
     - **Blue**: User permissions (CheckCircle)
     - **Orange**: Login attempts (XCircle)
     - **Purple**: Archive operations (CheckCircle)
   - Action description text

4. **Status**
   - Badge with colored background and border:
     - **Success**: Green background, green text
     - **Denied**: Red background, red text
     - **Pending**: Yellow background, yellow text
   - Capitalized status text

5. **Origin (IP/Device)**
   - IP Address: Bold text (e.g., "192.168.1.44")
   - Device info: Smaller text (e.g., "macOS • Chrome 118")

6. **Details**
   - Right-aligned chevron icon (blue)
   - Click to view full log details

### 4. **Mock Audit Log Entries** (4 entries)

#### Entry 1 - System Root Password Change
- **User**: Jordan Dax (j.dax@wateroffice.io)
- **Avatar**: JD
- **Action**: System Root Password Change (red icon)
- **Status**: Success (green)
- **Origin**: 192.168.1.44, macOS • Chrome 118
- **Time**: Oct 31, 2023 14:23:16 UTC

#### Entry 2 - Updated User Permissions
- **User**: Mila Sonic (m.sonic@superoff.io)
- **Avatar**: MS
- **Action**: Updated User Permissions (blue icon)
- **Status**: Success (green)
- **Origin**: 45.22.112.9, Linux • Firefox 115
- **Time**: Oct 31, 2023 12:15:03 UTC

#### Entry 3 - SSH Login Attempt (Denied)
- **User**: Unknown Entity (Failed Authentication)
- **Avatar**: UE
- **Action**: SSH Login Attempt (orange icon)
- **Status**: Denied (red)
- **Origin**: 112.5.88.201, Terminal • CLI/704
- **Time**: Oct 31, 2023 11:42:49 UTC

#### Entry 4 - Archived Audit Logs
- **User**: Alex Helles (a.helles@core-lit.io)
- **Avatar**: AH
- **Action**: Archived Audit Logs (2023) (purple icon)
- **Status**: Success (green)
- **Origin**: 88.19.0.211, Windows • Edge 117
- **Time**: Oct 31, 2023 08:11:22 UTC

### 5. **Pagination**

Located at the bottom of the table:

#### Left Side
- Text: "Showing **1 to 25** of **1,248 entries**"
- Bold numbers for emphasis

#### Right Side (Pagination Controls)
- Previous button: ‹
- Page numbers: 1 (active/blue), 2, 3, ..., 50
- Next button: ›
- Active page highlighted with blue background

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Audit Logs                           [Export CSV][Live ●]   │
│ Immutable record of all...                                  │
├─────────────────────────────────────────────────────────────┤
│ [Date Range] [User Focus] [Action Type] [Device/IP]         │
│                                          Clear All Filters → │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Timestamp | User Entity | Action | Status | Origin | → │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ Oct 31... | Jordan Dax  | System | Success| 192.... | › │ │
│ │ Oct 31... | Mila Sonic  | Updated| Success| 45..... | › │ │
│ │ Oct 31... | Unknown     | SSH    | Denied | 112.... | › │ │
│ │ Oct 31... | Alex Helles | Archive| Success| 88..... | › │ │
│ └─────────────────────────────────────────────────────────┘ │
│ Showing 1 to 25 of 1,248 entries        ‹ 1 2 3 ... 50 ›   │
└─────────────────────────────────────────────────────────────┘
```

## Technical Implementation

### State Management

```typescript
const [dateRange, setDateRange] = useState('Oct 24 - Oct 31, 2023');
const [userFocus, setUserFocus] = useState('all-administrators');
const [actionType, setActionType] = useState('security-access');
const [deviceId, setDeviceId] = useState('global-network');
const [currentPage, setCurrentPage] = useState(1);
```

### Data Structures

#### AuditLog Interface
```typescript
interface AuditLog {
  id: string;
  timestamp: string;
  date: string;
  time: string;
  userEntity: {
    name: string;
    email: string;
    avatar: string;
  };
  action: {
    type: string;
    icon: 'password' | 'user' | 'login' | 'archive';
    description: string;
  };
  status: 'success' | 'denied' | 'pending';
  origin: {
    ip: string;
    device: string;
    browser: string;
  };
}
```

### Helper Functions

#### getStatusColor
Returns appropriate color classes based on status:
```typescript
const getStatusColor = (status: string) => {
  switch (status) {
    case 'success': return 'bg-green-50 text-green-700 border-green-200';
    case 'denied': return 'bg-red-50 text-red-700 border-red-200';
    case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    default: return 'bg-gray-50 text-gray-700 border-gray-200';
  }
};
```

#### getActionIcon
Returns colored icon component based on action type:
```typescript
const getActionIcon = (iconType: string) => {
  // Returns appropriate icon with colored background
  // Red: Password changes
  // Blue: User permissions
  // Orange: Login attempts
  // Purple: Archive operations
};
```

## Design Specifications

### Colors

#### Status Colors
- **Success**: `bg-green-50`, `text-green-700`, `border-green-200`
- **Denied**: `bg-red-50`, `text-red-700`, `border-red-200`
- **Pending**: `bg-yellow-50`, `text-yellow-700`, `border-yellow-200`

#### Action Icon Backgrounds
- **Password**: `bg-red-50`, icon `text-red-600`
- **User**: `bg-blue-50`, icon `text-blue-600`
- **Login**: `bg-orange-50`, icon `text-orange-600`
- **Archive**: `bg-purple-50`, icon `text-purple-600`

#### UI Colors
- Primary Blue: `bg-blue-600` (buttons, active states)
- Light Blue: `bg-blue-50` (active date filter)
- Gray Background: `bg-gray-50` (page background)
- White: `bg-white` (cards, table)

### Typography
- Page Title: `text-2xl font-bold`
- Subtitle: `text-sm text-gray-600`
- Column Headers: `text-xs font-semibold uppercase`
- Table Data: `text-sm font-medium` (names), `text-xs text-gray-500` (secondary info)

### Spacing
- Page Padding: `px-8 py-6`
- Header Padding: `px-8 py-6`
- Filter Padding: `px-8 py-4`
- Table Cell Padding: `px-6 py-4`
- Filter Grid Gap: `gap-4`

### Borders
- Page Sections: `border-b border-gray-200`
- Table: `border border-gray-200`
- Table Rows: `divide-y divide-gray-200`

## Interactive Elements

### 1. **Export CSV Button**
- White button with gray border
- Download icon
- Triggers CSV export (to be implemented)
- Hover effect: `hover:bg-gray-50`

### 2. **Live Monitoring Button**
- Blue button with white text
- Radio icon (live indicator)
- Opens real-time monitoring view
- Hover effect: `hover:bg-blue-700`

### 3. **Filter Inputs**
- All filters have focus rings: `focus:ring-2 focus:ring-blue-500`
- Dropdowns show arrow indicator
- Date range has calendar icon
- Device/IP has refresh icon

### 4. **Clear All Filters**
- Blue text link with refresh icon
- Resets all filters to default
- Hover effect: text darkens

### 5. **Table Rows**
- Hover effect: `hover:bg-gray-50`
- Smooth transitions
- Details chevron clickable

### 6. **Pagination Buttons**
- Active page: blue background with white text
- Inactive pages: gray text with hover effect
- Previous/Next: arrows with disabled states

## Future Backend Integration

When connecting to Supabase:

### Audit Log Storage
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES users(id),
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  status TEXT CHECK (status IN ('success', 'denied', 'pending')),
  ip_address INET NOT NULL,
  device TEXT,
  browser TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action_type ON audit_logs(action_type);
CREATE INDEX idx_audit_logs_status ON audit_logs(status);
```

### API Endpoints
```typescript
// Fetch audit logs with filters
GET /api/audit-logs?
  dateFrom=2023-10-24&
  dateTo=2023-10-31&
  userFocus=all-administrators&
  actionType=security-access&
  deviceId=global-network&
  page=1&
  limit=25

// Export audit logs as CSV
POST /api/audit-logs/export
Body: { filters, format: 'csv' }

// Real-time monitoring (WebSocket)
WS /api/audit-logs/live
```

### Query Implementation
```typescript
const fetchAuditLogs = async (filters) => {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .gte('timestamp', filters.dateFrom)
    .lte('timestamp', filters.dateTo)
    .eq('action_type', filters.actionType)
    .order('timestamp', { ascending: false })
    .range((page - 1) * 25, page * 25 - 1);
    
  return data;
};
```

### Real-Time Monitoring
```typescript
const subscribeToAuditLogs = () => {
  return supabase
    .channel('audit-logs')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'audit_logs' },
      (payload) => {
        // Add new log to the list in real-time
        console.log('New audit log:', payload.new);
      }
    )
    .subscribe();
};
```

## Security & Compliance Features

### Immutability
- Audit logs should be write-only (no updates or deletes)
- Use database policies to prevent modification
- Implement log archiving for old records

### Access Control
- Only Super Admins can view audit logs
- Implement role-based access control (RBAC)
- Log all access to audit logs

### Data Retention
- Configure retention policies (e.g., 7 years)
- Automated archiving to cold storage
- Compliance with data protection regulations

### Export & Reporting
- CSV export with all columns
- PDF report generation
- Scheduled email reports
- Integration with SIEM systems

## Testing Checklist

- ✅ Page loads without errors
- ✅ All filters display correctly
- ✅ Filter dropdowns are functional
- ✅ Date range input accepts dates
- ✅ Clear All Filters button works
- ✅ Table displays audit logs
- ✅ User avatars render with initials
- ✅ Action icons show correct colors
- ✅ Status badges display proper colors
- ✅ Origin information formats correctly
- ✅ Details chevron is clickable
- ✅ Pagination displays correctly
- ✅ Page numbers are clickable
- ✅ Export CSV button is visible
- ✅ Live Monitoring button is visible
- ✅ Hover effects work on table rows
- ✅ Responsive layout on different sizes
- ✅ All icons render correctly

## Accessibility

- Proper table structure with `<thead>` and `<tbody>`
- Column headers with semantic markup
- Color contrast meets WCAG AA standards
- Focus indicators on all interactive elements
- Screen reader friendly status badges
- Keyboard navigation support
- ARIA labels for icon-only buttons

## Performance Considerations

- Pagination limits data to 25 rows per page
- Lazy loading for large datasets
- Debounced filter inputs (future)
- Virtualized scrolling for thousands of rows (future)
- Index optimization for fast queries
- Caching frequently accessed date ranges

## Integration with App.tsx

```typescript
import AuditLogs from './pages/AuditLogs';

// In switch statement:
case 'audit-logs':
  return <AuditLogs />;
```

## Dependencies

- React 18
- TypeScript
- TailwindCSS
- Lucide React Icons:
  - Calendar
  - Download
  - Radio
  - ChevronRight
  - RefreshCcw
  - AlertCircle
  - CheckCircle
  - XCircle

---

**Status**: ✅ Complete (UI only, backend integration pending)
**Last Updated**: July 12, 2026
**Developer**: Kiro AI
**Compliance**: Designed for audit trail requirements and security monitoring
