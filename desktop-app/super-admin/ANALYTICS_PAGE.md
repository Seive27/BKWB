# Analytics Page - Super Admin Dashboard

## Overview

The Analytics page provides real-time performance metrics and system health monitoring for the BKWB Super Admin Dashboard. It displays comprehensive analytics data including user statistics, activity trends, system performance, and recent exports.

## File Location

- **Component**: `src/pages/Analytics.tsx`
- **Modal Component**: `src/components/ExportReportModal.tsx`
- **Route**: Accessible via Sidebar → "Analytics"

## Features Implemented

### 1. **Page Header**
- Title: "Analytics Overview"
- Subtitle: "Real-time performance metrics and system health monitoring."
- Time Filter Buttons: Daily, Weekly, Monthly
- Export Button with download icon (opens Export Report modal)

### 2. **Export Report Modal**
When the Export button is clicked, a modal opens with:

#### File Format Selection (3 options)
- **PDF**: With file icon (blue when selected)
- **CSV**: With table icon (blue when selected)
- **Excel**: With spreadsheet icon (blue when selected)
- Visual selection with blue border and background when active

#### Date Range Selection
- Dropdown with predefined ranges:
  - Current Month (Nov 1 - Nov 30)
  - Last Month
  - Last 3 Months
  - Last 6 Months
  - Custom Range
- Start Date picker (format: 2023-11-01)
- End Date picker (format: 2023-11-30)

#### Modules to Include (6 checkboxes in 2 columns)
Left Column:
- ☑ Overview Analytics (checked by default)
- ☐ System Health
- ☐ Security Alerts

Right Column:
- ☑ User Access Logs (checked by default)
- ☑ Audit History (checked by default)
- ☐ Storage Metrics

#### Modal Actions
- **Cancel Button**: Close modal without action
- **Download Report Button**: Blue button with download icon

### 3. **Statistics Cards** (4 cards)

#### Total Users Card
- Icon: Users icon (blue background)
- Value: 24,592
- Growth Indicator: +12.5% (green)
- Description: "TOTAL USERS"

#### Active Users Card
- Icon: Activity icon (green background)
- Value: 8,103
- Growth Indicator: +4.2% (green)
- Description: "ACTIVE USERS"

#### System Usage Card
- Icon: Gauge icon (gray background)
- Value: 68.4%
- Status Badge: "Stable"
- Description: "SYSTEM USAGE"

#### Error Rate Card
- Icon: TrendingDown icon (red background)
- Value: 0.14%
- Change Indicator: -0.6% (green, meaning improvement)
- Description: "ERROR RATE"

### 3. **User Activity Over Time Chart**
- **Type**: Line chart with two data series
- **Title**: "User Activity Over Time"
- **Subtitle**: "Daily unique sessions and registrations"
- **Data Series**:
  - Sessions (blue line)
  - Signups (cyan line)
- **X-axis**: Days of week (MON through SUN)
- **Features**:
  - Smooth curves using SVG paths
  - Legend with color indicators
  - 7-day time range
  - Mock data shows realistic patterns

### 4. **Recent Exports Panel**
- **Title**: "Recent Exports"
- **Action**: "View All" link
- **Export Items** (3 files):
  1. **Q3_System_Usage.pdf**
     - Icon: PDF (red)
     - Details: "Exported 3 months ago, 4.6 MB"
  2. **User_Growth_Weekly.csv**
     - Icon: CSV (green)
     - Details: "Exported 2 weeks ago, 234 KB"
  3. **Security_Audit_Log.xlsx**
     - Icon: Excel (blue)
     - Details: "Exported Yesterday, 11 MB"
- **Features**:
  - File type icons
  - File names and metadata
  - More options menu (three dots)
  - Hover effects

### 5. **System Latency Chart**
- **Type**: Bar chart
- **Title**: "System Latency (ms)"
- **Time Range**: "LAST 24 HOURS"
- **Status Indicator**: "All systems normal" with green checkmark
- **Data**: 24 bars representing hourly latency
- **Visual Features**:
  - Light blue bars for normal latency
  - Dark blue bars for peak latency (spike detection at hour 12)
  - Color-coded legend (Normal/Peak)
  - Responsive height based on max value

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Analytics Overview                    [Daily][Weekly][Monthly][Export] │
│ Real-time performance metrics...                            │
├─────────────────────────────────────────────────────────────┤
│ [Total Users] [Active Users] [System Usage] [Error Rate]    │
├─────────────────────────────────────────────────────────────┤
│ User Activity Chart (2/3 width)    │ Recent Exports         │
│ [Line chart with sessions/signups] │ [Export file list]     │
├─────────────────────────────────────────────────────────────┤
│ System Latency Chart (full width)                           │
│ [24-hour bar chart]                                         │
└─────────────────────────────────────────────────────────────┘
```

## Technical Implementation

### State Management
```typescript
const [timeFilter, setTimeFilter] = useState<'daily' | 'weekly' | 'monthly'>('daily');
const [isExportModalOpen, setIsExportModalOpen] = useState(false);
```

### Data Structures

#### Export Report Modal State
```typescript
const [selectedFormat, setSelectedFormat] = useState<FileFormat>('pdf');
const [dateRange, setDateRange] = useState<DateRange>('current-month');
const [startDate, setStartDate] = useState('2023-11-01');
const [endDate, setEndDate] = useState('2023-11-30');
const [modules, setModules] = useState<ExportModule[]>([...]);
```

#### Export File Interface
```typescript
interface ExportFile {
  id: string;
  name: string;
  type: 'pdf' | 'csv' | 'xlsx';
  exportedDate: string;
  size: string;
}
```

#### Mock Data
- **User Activity**: 7-day sessions and signups data
- **System Latency**: 24-hour hourly data with spike detection
- **Export Files**: 3 recent export records

### SVG Chart Implementation
- Custom SVG path generation for line charts
- Dynamic bar chart rendering with responsive heights
- Color-coded visualization (blue for sessions, cyan for signups)

## Design Specifications

### Colors
- **Primary Blue**: `#3b82f6` (Sessions line, dark bars)
- **Cyan**: `#06b6d4` (Signups line)
- **Light Blue**: `bg-blue-50`, `bg-blue-100`, `bg-blue-200`
- **Green**: For positive growth indicators
- **Red**: For error-related icons
- **Gray**: Background and neutral elements

### Typography
- Page Title: `text-2xl font-bold`
- Card Values: `text-3xl font-bold`
- Labels: `text-xs uppercase font-medium`
- Chart Titles: `text-base font-semibold`

### Spacing
- Page Padding: `p-8`
- Card Padding: `p-6`
- Grid Gap: `gap-6`

## Interactive Elements

1. **Time Filter Buttons**
   - Toggle between Daily/Weekly/Monthly views
   - Active state highlighted with blue background

2. **Export Button**
   - Primary blue button with download icon
   - Opens Export Report modal on click

3. **Export Report Modal**
   - File format selection (PDF/CSV/Excel)
   - Date range dropdown and date pickers
   - Module checkboxes (6 options)
   - Cancel and Download Report buttons
   - Modal overlay with backdrop

4. **Export File Items**
   - Hover effect: `hover:bg-gray-50`
   - More options menu button

5. **View All Link**
   - Blue text with hover effect
   - Links to full exports list

## Future Backend Integration

When connecting to Supabase:
- Replace mock data with real analytics queries
- Implement time filter functionality
- Add real-time data updates
- Connect export functionality
- Add data range selectors
- Implement drill-down features

## Integration with App.tsx

```typescript
import Analytics from './pages/Analytics';

// In switch statement:
case 'analytics':
  return <Analytics />;
```

## Testing Checklist

- ✅ Page loads without errors
- ✅ All statistics cards display correctly
- ✅ User activity chart renders properly
- ✅ Export files list shows with icons
- ✅ System latency chart displays bars
- ✅ Time filter buttons toggle states
- ✅ Export button opens modal
- ✅ Export modal displays all sections
- ✅ File format selection works
- ✅ Date pickers are functional
- ✅ Module checkboxes toggle correctly
- ✅ Modal close button works
- ✅ Download Report button triggers export
- ✅ Responsive layout on different window sizes
- ✅ Hover effects work on interactive elements
- ✅ Icons render correctly (Lucide React)

## Dependencies

- React 18
- TypeScript
- TailwindCSS
- Lucide React Icons:
  - Users
  - Activity
  - Gauge
  - TrendingDown
  - Download
  - MoreVertical
  - FileText
  - Table
  - FileSpreadsheet
  - CheckCircle
  - X (for modal close button)

## Components Created

### Analytics.tsx
- Main analytics dashboard page
- Statistics cards
- User activity chart
- Recent exports panel
- System latency chart

### ExportReportModal.tsx
- Export configuration modal
- File format selection
- Date range selection
- Module selection checkboxes
- Export action handlers

## Browser Compatibility

- Tested in Electron/Chromium environment
- SVG charts compatible with modern browsers
- Responsive design for desktop viewports

## Performance Notes

- SVG charts are lightweight and performant
- Mock data generation is minimal
- No heavy computations or API calls (yet)
- Charts render on initial load without flickering

---

**Status**: ✅ Complete
**Last Updated**: July 12, 2026
**Developer**: Kiro AI
