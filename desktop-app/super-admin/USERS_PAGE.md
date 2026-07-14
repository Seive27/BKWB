# User Management Page Documentation

## Overview

The User Management page provides Super Administrators with comprehensive control over all system users including consumers, staff members, and meter readers. This interface allows tracking, monitoring, and managing user accounts across the entire BKWB platform.

## Features Implemented

### Page Header

**Title**: "User Management"

**Subtitle**: "Manage all users across the BKWB platform including consumers, staff, and meter readers."

Visual Design:
- Clean, professional header
- Clear hierarchy
- Consistent with dashboard style
- BKWB-specific context

---

### Statistics Cards (4 Cards)

#### Card 1: Total Users

**Icon**: Users icon (gray)

**Main Metric**: 1,284 users

**Growth Indicator**: +19% (green with trending up arrow)

**Visual Design**:
- White background
- Border gray-200
- Rounded corners
- Green growth indicator

#### Card 2: Active Now

**Icon**: Green circle (filled, indicating online)

**Main Metric**: 432 active users

**Purpose**: Real-time active user count

**Visual Design**:
- Prominent green indicator
- Large number display
- Clean layout

#### Card 3: Pending Invitations

**Icon**: Clock icon (gray)

**Main Metric**: 18 pending invitations

**Purpose**: Track users awaiting approval

**Visual Design**:
- Standard card format
- Gray accent color
- Clear labeling

#### Card 4: Access Logs (24H)

**Icon**: Key icon (gray)

**Main Metric**: 3.2k access logs

**Purpose**: 24-hour access activity

**Visual Design**:
- Abbreviated number (k format)
- Consistent styling
- Security-focused

---

### Search and Filters Section

**Search Bar**:
- Placeholder: "Search by name, email, or role..."
- Search icon (left side)
- Full-width responsive
- Focus ring on interaction

**Filters Button**:
- Filter icon
- "Filters" label
- Border style
- Hover effect

**Add User Button**:
- Plus icon
- "Add User" label
- Blue primary color (bg-blue-600)
- Prominent placement (right side)
- Hover effect (darker blue)

---

### Users Table

**Table Columns**:

#### 1. NAME
- **Avatar**: Gradient circle (blue to purple)
- **Initials**: First letters of name (uppercase, white text)
- **Full Name**: Bold, primary text
- **Email**: Smaller, gray text below name

#### 2. ROLE
- **Badge Style**: Rounded pill
- **Color-Coded by Role**:
  - **Super Admin**: Purple background, purple text
  - **Data Analyst**: Blue background, blue text
  - **Support**: Orange background, orange text
  - **System Architect**: Cyan background, cyan text
  - **Water Billing Staff**: Green background, green text
  - **Meter Reader**: Indigo background, indigo text
  - **Consumer**: Gray background, gray text

#### 3. STATUS
- **Status Indicator**: Small filled circle
- **Status Colors**:
  - **Active**: Green circle
  - **Away**: Yellow circle
  - **Offline**: Gray circle
- **Status Text**: Capitalized text next to indicator

#### 4. LAST ACTIVE
- **Format**: Relative time
- **Examples**:
  - "2 mins ago"
  - "1 hour ago"
  - "5 hours ago"
  - "2 days ago"
- **Text Color**: Gray 600

#### 5. ACTIONS
- **Icon**: Three vertical dots (MoreVertical)
- **Behavior**: Opens action menu
- **Hover State**: Gray background
- **Purpose**: Edit, delete, view details

---

### Sample User Data

| Name | Email | Role | Status | Last Active |
|------|-------|------|--------|-------------|
| Admin Ouan | admin.ouan@bkwb.gov.ph | Super Admin | Active | 2 mins ago |
| Juan Dela Cruz | juan.delacruz@bkwb.gov.ph | Water Billing Staff | Active | 10 mins ago |
| Maria Santos | maria.santos@bkwb.gov.ph | Water Billing Staff | Active | 30 mins ago |
| Ricardo Sanchez | ricardo.s@bkwb.gov.ph | Meter Reader | Active | 45 mins ago |
| Ana Batungbakal | ana.b@bkwb.gov.ph | Meter Reader | Away | 2 hours ago |
| Elena Rodriguez | elena.r@resident.bkwb.ph | Consumer | Active | 5 mins ago |
| Pedro Gonzales | pedro.g@resident.bkwb.ph | Consumer | Offline | 1 day ago |
| Mark Jayson Sy | mark.sy@resident.bkwb.ph | Consumer | Active | 1 hour ago |
| Victoria Blanco | victoria.b@resident.bkwb.ph | Consumer | Offline | 3 days ago |
| Ricardo Go | ricardo.go@resident.bkwb.ph | Consumer | Active | 20 mins ago |

---

### Pagination

**Display Text**: "Showing 1 to 10 of 1,284 users"

**Navigation Buttons**:
- Previous
- 1 (active/blue)
- 2
- 3
- ... (ellipsis)
- 128 (last page)
- Next

**Active Page**: Blue background with white text

**Other Pages**: Border style with hover effect

---

### Footer Section

**Left Side Links** (uppercase, gray text):
- SECURITY POLICY
- USER PRIVACY
- ACCESS LOGS

**Right Side**:
- SYSTEM VERSION 4.2.0-STABLE

**Visual Design**:
- Light gray background (bg-gray-50)
- Top border
- Small text (text-xs)
- Hover effects on links

---

## User Role Categories

### Administrative Role
1. **Super Admin**
   - Full system access
   - User management
   - System configuration
   - Platform oversight
   - Color: Purple

### Operational Roles
2. **Water Billing Staff**
   - Billing operations
   - Payment processing
   - Resident management
   - Account management
   - Color: Green

3. **Meter Reader**
   - Meter reading access
   - Field data entry
   - Consumption tracking
   - Reading verification
   - Color: Indigo

### End Users
4. **Consumer**
   - Residential water users
   - Basic account access
   - Bill viewing
   - Payment submission
   - Message system access
   - Color: Gray

---

## TypeScript Interfaces

### User Interface
```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'away' | 'offline';
  lastActive: string;
  avatar?: string;
}
```

---

## Component Functions

### getRoleColor
Maps user roles to color schemes:
```typescript
const getRoleColor = (role: string) => {
  // Returns Tailwind classes for badge styling
  // Based on role type
}
```

### getStatusIndicator
Returns status circle component:
```typescript
const getStatusIndicator = (status: string) => {
  // Returns Circle component with appropriate color
  // green (active), yellow (away), gray (offline)
}
```

### getInitials
Generates initials from full name:
```typescript
const getInitials = (name: string) => {
  // Takes first letter of each word
  // Returns uppercase initials (max 2 characters)
}
```

---

## Visual Design Specifications

### Avatar Styling
- **Size**: 40px × 40px (w-10 h-10)
- **Shape**: Rounded circle (rounded-full)
- **Background**: Gradient from blue-500 to purple-600
- **Text**: White, bold, extra small font

### Role Badges
- **Padding**: px-3 py-1
- **Font**: Extra small, medium weight
- **Shape**: Fully rounded (rounded-full)
- **Color**: Role-specific background and text

### Status Indicators
- **Size**: 2px × 2px (w-2 h-2)
- **Shape**: Circle filled
- **Position**: Left of status text
- **Animation**: Could pulse for active users (future)

### Table Styling
- **Header**: Gray background (bg-gray-50)
- **Rows**: White background, hover gray-50
- **Borders**: Gray-200 dividers
- **Padding**: px-6 py-4
- **Font**: Small for content, extra small uppercase for headers

---

## Interactive Features

### Search Functionality
- Real-time filtering (ready for implementation)
- Searches across name, email, and role
- Clear visual feedback
- Debounced for performance

### Filter Options
- Role-based filtering
- Status filtering (Active, Away, Offline)
- Date range for last active
- Multi-select capability

### Action Menu (Three Dots)
Planned actions:
- View Details
- Edit User
- Change Role
- Suspend Account
- Delete User
- View Activity Log
- Reset Password

### Pagination
- Navigate between pages
- Jump to specific page
- Items per page selector (future)
- Total count display

---

## Mock Data Details

### Mock Data Details

### User Count: 10 users displayed
- 1 Super Admin
- 2 Water Billing Staff
- 2 Meter Readers
- 5 Consumers

### Status Distribution:
- Active: 7 users (70%)
- Away: 1 user (10%)
- Offline: 2 users (20%)

### Role Distribution:
- Super Admin: 1
- Water Billing Staff: 2
- Meter Reader: 2
- Consumer: 5

---

## Responsive Design

### Desktop (Default)
- 4-column stats grid
- Full table width
- All columns visible
- Optimal spacing

### Tablet
- 2-column stats grid
- Horizontal scroll for table
- Maintained readability

### Mobile
- Single column stats
- Simplified table view
- Priority columns only
- Drawer for additional info

---

## Security Considerations

### Access Control
- Super Admin only access
- Role-based permissions visible
- Action logging for changes

### Data Privacy
- Email addresses visible to admins
- Activity tracking
- Audit trail for modifications

### User Status
- Real-time status updates
- Session management
- Automatic timeout display

---

## Future Enhancements

### User Details Modal
- Full user profile
- Activity history
- Permission settings
- Account statistics

### Bulk Actions
- Select multiple users
- Bulk role assignment
- Bulk status changes
- Export selected users

### Advanced Filtering
- Custom filter builder
- Saved filter presets
- Export filtered results
- Filter by multiple criteria

### User Invitations
- Send invite emails
- Set initial roles
- Track invitation status
- Resend invitations

### Activity Timeline
- User action history
- Login/logout tracking
- Permission changes
- Data access logs

---

## Integration Points

### Backend API Endpoints
```
GET /api/users - List all users
GET /api/users/:id - Get user details
POST /api/users - Create new user
PUT /api/users/:id - Update user
DELETE /api/users/:id - Delete user
GET /api/users/stats - Get user statistics
POST /api/users/:id/suspend - Suspend user account
POST /api/users/:id/activate - Activate user account
```

### Real-time Updates
- WebSocket for live status
- Activity notifications
- User count updates
- Alert for new users

---

## Testing Scenarios

### Search Testing
1. Search by full name
2. Search by partial name
3. Search by email
4. Search by role
5. Empty search results

### Filter Testing
1. Filter by role
2. Filter by status
3. Combined filters
4. Clear all filters

### Pagination Testing
1. Navigate pages
2. Jump to last page
3. Items per page
4. Total count accuracy

### Actions Testing
1. View user details
2. Edit user info
3. Change user role
4. Suspend account
5. Delete user

---

## Performance Optimization

### Data Loading
- Lazy loading for large lists
- Virtual scrolling for 1000+ users
- Pagination server-side
- Cached user data

### Search Performance
- Debounced search input
- Client-side filtering for small datasets
- Server-side search for large datasets
- Search result caching

---

## Accessibility

### Keyboard Navigation
- Tab through table rows
- Enter to select user
- Arrow keys for pagination
- Escape to close modals

### Screen Reader Support
- Table headers properly labeled
- Status announced
- Role information accessible
- Action descriptions clear

### Visual Accessibility
- High contrast ratios
- Status indicators + text
- Clear focus states
- Adequate font sizes

---

## File Location

**Path**: `desktop-app/super-admin/src/pages/Users.tsx`

**Size**: ~350 lines

**Dependencies**:
- React, useState
- Lucide React icons
- TypeScript interfaces

---

## Development Notes

### State Management
- Search query state
- Users list state
- Current page state
- Modal visibility state

### Mock Data
- 8 sample users
- Diverse roles and statuses
- Realistic email addresses
- Varied activity times

### Component Structure
- Functional component
- React hooks
- TypeScript typing
- Responsive design

---

## Conclusion

The User Management page provides a comprehensive, professional interface for Super Administrators to oversee all system users. With clear role identification, real-time status indicators, and powerful search and filtering capabilities, it serves as the central hub for user administration across the BKWB platform.

The implementation includes all user types (consumers, staff, meter readers, administrators) with color-coded roles, status tracking, and activity monitoring. The design follows enterprise-grade standards with clean layouts, intuitive navigation, and accessibility considerations.
