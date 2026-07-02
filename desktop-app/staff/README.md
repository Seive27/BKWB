# Kalunasan Waters - Staff Dashboard

A modern desktop application for managing water billing operations in Kalunasan Barangay.

## Features

- 📊 **Dashboard Analytics** - Real-time statistics and revenue tracking
- 👥 **Resident Management** - Manage water service subscribers
- 📏 **Meter Readings** - Track and record water consumption
- 💵 **Billing System** - Generate and manage water bills
- 💳 **Payment Processing** - Record and track payments
- 📢 **Announcements** - Broadcast updates to residents
- 📨 **Messaging** - Communication with residents
- 📈 **Reports** - Generate detailed reports

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Desktop Framework**: Electron
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Build Tool**: Vite

## Installation

1. Install dependencies:
```bash
npm install
```

2. Run development server (web only):
```bash
npm run dev
```

3. Run Electron desktop app:
```bash
npm run electron:dev
```

4. Build for production:
```bash
npm run electron:build
```

## Project Structure

```
staff/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   ├── StatCard.tsx
│   │   ├── RevenueChart.tsx
│   │   ├── MeterReadingsTable.tsx
│   │   └── AnnouncementsPanel.tsx
│   ├── pages/            # Page components
│   │   └── Dashboard.tsx
│   ├── data/             # Mock data
│   │   └── mockData.ts
│   ├── types/            # TypeScript types
│   │   └── index.ts
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # React entry point
│   └── index.css         # Global styles
├── electron/             # Electron main process
│   ├── main.js
│   └── preload.js
└── public/               # Static assets

```

## Design Specifications

- **Primary Colors**: Blue (#3b82f6)
- **Screen Resolutions**: Optimized for 1920×1080 and 1366×768
- **Layout**: Left sidebar navigation, top header, main content area
- **Theme**: Light theme with clean, minimal design

## Development

The application uses:
- Hot Module Replacement (HMR) for fast development
- TypeScript for type safety
- Tailwind CSS for responsive design
- Component-based architecture for maintainability

## Building for Production

To create a distributable Electron app:

```bash
npm run electron:build
```

This will create installers in the `dist-electron` folder.

## License

Proprietary - Kalunasan Barangay Water Management System
