# BKWB Super Admin Dashboard

Super Admin dashboard for the Barangay Kalunasan Water Billing and Information System (BKWB).

## Features

- **Dashboard Overview**: System statistics, user activity trends, security alerts
- **User Activity Chart**: Visual representation of system usage
- **Global Settings Status**: MFA, Encryption, Data Backup status
- **Recent Activity Log**: Real-time activity monitoring
- **Security Alerts**: High-priority alerts dashboard

## Tech Stack

- React 18
- TypeScript
- Vite
- TailwindCSS
- Lucide React Icons

## Getting Started

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

The app will be available at http://localhost:5173/

### Build for Production

```bash
npm run build
```

## Project Structure

```
super-admin/
├── src/
│   ├── components/
│   │   └── Sidebar.tsx
│   ├── data/
│   │   └── mockData.ts
│   ├── pages/
│   │   └── Dashboard.tsx
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Features Implemented

### Dashboard Page

**Statistics Cards**:
- Total Users (12,842)
  - Active: 9,201
  - Pending: 3,641
- Security Alerts (03)
  - High priority alerts

**User Activity Trends**:
- Daily/Weekly view toggle
- Bar chart visualization
- 7-day activity data

**Global Settings Status**:
- MFA Status: Enabled
- Encryption: AES-256
- Data Backup: 100% OK

**Recent Activity Log Table**:
- Timestamp tracking
- User type badges (SA, EXT, USER)
- Action descriptions
- Status indicators (Success, Modified, Denied)

### Sidebar Navigation

**Menu Items**:
- Dashboard
- Users
- Analytics
- Audit Logs
- System Settings

**Admin Info**:
- Profile display
- Email address

## Mock Data

All data is currently using mock data for demonstration purposes. Backend integration is ready to implement.

## Color Scheme

- Primary Blue: #2563eb
- Success Green: #10b981
- Warning Orange: #f59e0b
- Error Red: #ef4444
- Gray Scale: #f9fafb to #111827

## Design Principles

- Clean, professional interface
- Government system aesthetic
- High-contrast for accessibility
- Responsive layout
- Clear visual hierarchy

## Future Enhancements

- User management page
- Advanced analytics
- Full audit log history
- System settings configuration
- Real-time notifications
- Backend API integration
