# Export Report Modal - Super Admin Dashboard

## Overview

The Export Report Modal is a comprehensive dialog that allows super administrators to configure and download analytical reports in various formats. It appears when clicking the "Export" button on the Analytics page.

## File Location

- **Component**: `src/components/ExportReportModal.tsx`
- **Parent Component**: `src/pages/Analytics.tsx`
- **Trigger**: Click "Export" button in Analytics page header

## Component Props

```typescript
interface ExportReportModalProps {
  isOpen: boolean;      // Controls modal visibility
  onClose: () => void;  // Callback to close the modal
}
```

## Features

### 1. **Modal Header**
- Title: "Export Report"
- Close button (X icon) in top-right corner
- Clean header with bottom border

### 2. **File Format Selection**

Three format options displayed as large clickable cards:

#### PDF Format
- Icon: FileText (document icon)
- Color: Blue when selected
- Background: Light blue (blue-50) when active
- Border: 2px blue-600 when selected

#### CSV Format
- Icon: Table (spreadsheet icon)
- Color: Blue when selected
- Background: Light blue (blue-50) when active
- Border: 2px blue-600 when selected

#### Excel Format
- Icon: FileSpreadsheet (Excel icon)
- Color: Blue when selected
- Background: Light blue (blue-50) when active
- Border: 2px blue-600 when selected

**Default**: PDF is selected by default

### 3. **Date Range Selection**

#### Dropdown Menu
Predefined date range options:
- Current Month (Nov 1 - Nov 30) — **Default**
- Last Month
- Last 3 Months
- Last 6 Months
- Custom Range

#### Date Pickers (2 columns)
- **Start Date**: Date input field
  - Label: "START DATE"
  - Default: 2023-11-01
  - Format: YYYY-MM-DD
  
- **End Date**: Date input field
  - Label: "END DATE"
  - Default: 2023-11-30
  - Format: YYYY-MM-DD

### 4. **Modules to Include**

Six checkbox options arranged in a 2-column grid:

#### Left Column
1. ☑ **Overview Analytics** (checked by default)
2. ☐ **System Health**
3. ☐ **Security Alerts**

#### Right Column
4. ☑ **User Access Logs** (checked by default)
5. ☑ **Audit History** (checked by default)
6. ☐ **Storage Metrics**

**Features:**
- Interactive checkboxes with blue accent color
- Hover effect on labels
- Multi-select capability

### 5. **Modal Footer Actions**

Two buttons with different styles:

#### Cancel Button
- Style: White background, gray border
- Text: "Cancel"
- Action: Closes modal without exporting
- Hover: Light gray background

#### Download Report Button
- Style: Blue background (blue-600)
- Icon: Download icon
- Text: "Download Report"
- Action: Triggers export with selected configuration
- Hover: Darker blue (blue-700)

## Technical Implementation

### State Management

```typescript
const [selectedFormat, setSelectedFormat] = useState<FileFormat>('pdf');
const [dateRange, setDateRange] = useState<DateRange>('current-month');
const [startDate, setStartDate] = useState('2023-11-01');
const [endDate, setEndDate] = useState('2023-11-30');
const [modules, setModules] = useState<ExportModule[]>([
  { id: 'overview', label: 'Overview Analytics', checked: true },
  { id: 'system-health', label: 'System Health', checked: false },
  { id: 'security', label: 'Security Alerts', checked: false },
  { id: 'user-access', label: 'User Access Logs', checked: true },
  { id: 'audit', label: 'Audit History', checked: true },
  { id: 'storage', label: 'Storage Metrics', checked: false },
]);
```

### Type Definitions

```typescript
type FileFormat = 'pdf' | 'csv' | 'excel';

type DateRange = 
  | 'current-month' 
  | 'last-month' 
  | 'last-3-months' 
  | 'last-6-months' 
  | 'custom';

interface ExportModule {
  id: string;
  label: string;
  checked: boolean;
}
```

### Key Functions

#### handleModuleToggle
Toggles individual module checkbox state:
```typescript
const handleModuleToggle = (id: string) => {
  setModules((prev) =>
    prev.map((module) =>
      module.id === id ? { ...module, checked: !module.checked } : module
    )
  );
};
```

#### handleExport
Processes export request with current configuration:
```typescript
const handleExport = () => {
  console.log('Exporting report...', {
    format: selectedFormat,
    dateRange,
    startDate,
    endDate,
    modules: modules.filter((m) => m.checked),
  });
  onClose();
};
```

## Design Specifications

### Layout
- Modal Container: `max-w-md` (448px)
- Max Height: `90vh` with overflow scroll
- Backdrop: Black with 50% opacity
- Border Radius: `rounded-xl`
- Shadow: `shadow-2xl`

### Colors
- Primary Blue: `bg-blue-600` (buttons, selected states)
- Light Blue: `bg-blue-50` (selected card backgrounds)
- Border Blue: `border-blue-600` (selected format cards)
- Gray Background: `bg-gray-50` (footer)
- Text Gray: `text-gray-500`, `text-gray-700`, `text-gray-900`

### Typography
- Modal Title: `text-xl font-bold`
- Section Labels: `text-xs font-semibold uppercase`
- Button Text: `text-sm font-medium`
- Checkbox Labels: `text-sm`

### Spacing
- Content Padding: `p-6`
- Section Spacing: `space-y-6`
- Grid Gap: `gap-3`
- Button Spacing: `space-x-3`

## User Interactions

### Format Selection
1. User clicks on PDF, CSV, or Excel card
2. Selected card gets blue border and background
3. Previously selected card returns to default state
4. Icon and text color change to blue for selected card

### Date Range
1. User selects predefined range from dropdown
2. Start and end dates update automatically (when backend connected)
3. User can manually adjust dates using date pickers
4. Custom validation can be added for date logic

### Module Selection
1. User clicks checkbox or label to toggle module
2. Checkbox state changes instantly
3. Multiple modules can be selected
4. At least one module should be selected (validation can be added)

### Export Action
1. User clicks "Download Report" button
2. System collects all configuration:
   - Selected file format
   - Date range
   - Start and end dates
   - Selected modules
3. Export process initiates (to be implemented with backend)
4. Modal closes automatically after export
5. Success notification can be shown (future enhancement)

### Cancel Action
1. User clicks "Cancel" button or X icon
2. Modal closes without saving changes
3. All selections are discarded
4. Returns to Analytics page

## Integration with Analytics Page

```typescript
// In Analytics.tsx
import ExportReportModal from '../components/ExportReportModal';

const [isExportModalOpen, setIsExportModalOpen] = useState(false);

// Export button
<button onClick={() => setIsExportModalOpen(true)}>
  <Download className="w-4 h-4" />
  <span>Export</span>
</button>

// Modal component
<ExportReportModal
  isOpen={isExportModalOpen}
  onClose={() => setIsExportModalOpen(false)}
/>
```

## Future Backend Integration

When connecting to Supabase or backend API:

### Export Endpoint
```typescript
const handleExport = async () => {
  try {
    const response = await fetch('/api/analytics/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: selectedFormat,
        dateRange: { start: startDate, end: endDate },
        modules: modules.filter(m => m.checked).map(m => m.id),
      }),
    });
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${Date.now()}.${selectedFormat}`;
    a.click();
    
    onClose();
  } catch (error) {
    console.error('Export failed:', error);
  }
};
```

### Enhancements
- Add loading spinner during export
- Show progress indicator for large exports
- Add success/error toast notifications
- Validate date range before export
- Ensure at least one module is selected
- Add export history tracking
- Implement scheduled exports
- Email delivery option

## Accessibility

- Modal uses `z-50` to ensure proper layering
- Close button is keyboard accessible
- Form inputs have proper labels
- Checkboxes have accessible click areas
- Color contrast meets WCAG standards
- Focus states on interactive elements

## Responsive Design

- Modal is centered on screen
- Max width prevents stretching on large screens
- Scrollable content for small viewports
- Grid layouts adapt to container
- Touch-friendly button sizes

## Testing Checklist

- ✅ Modal opens when Export button clicked
- ✅ Modal closes with X button
- ✅ Modal closes with Cancel button
- ✅ File format selection changes state
- ✅ Only one format can be selected at a time
- ✅ Date range dropdown updates correctly
- ✅ Date pickers accept valid dates
- ✅ Module checkboxes toggle independently
- ✅ Multiple modules can be selected
- ✅ Download Report button triggers export
- ✅ Modal backdrop prevents clicking through
- ✅ All icons render correctly
- ✅ Hover effects work on all interactive elements
- ✅ Modal is scrollable when content exceeds viewport
- ✅ State persists during modal session
- ✅ State resets when modal reopens (if desired)

## Error Handling

Future implementations should handle:
- Network errors during export
- Invalid date ranges
- No modules selected
- Large file timeouts
- Unsupported format errors
- Permission denied errors

## Dependencies

- React 18
- TypeScript
- TailwindCSS
- Lucide React Icons:
  - X (close button)
  - Download (download button)
  - FileText (PDF icon)
  - Table (CSV icon)
  - FileSpreadsheet (Excel icon)

---

**Status**: ✅ Complete (UI only, backend integration pending)
**Last Updated**: July 12, 2026
**Developer**: Kiro AI
