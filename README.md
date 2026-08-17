# BKWB – Barangay Kalunasan Water Billing System

## Project Description / Purpose

BKWB (Barangay Kalunasan Water Billing System) is a web, desktop, and mobile-based water billing and service information system developed for Barangay Kalunasan.

The system aims to improve the efficiency and accuracy of water billing operations by providing a centralized platform for managing residents, meter readings, bills, payments, announcements, notifications, and service concerns.

The system is designed for three main groups of users:

- **Barangay Staff** – manages residents, meter readings, billing, payments, announcements, and service concerns.
- **Super Admin** – manages system users, system settings, analytics, and audit logs.
- **Residents and Meter Readers** – access the system through mobile applications to view billing information, receive announcements, manage their accounts, and perform assigned meter-reading tasks.

## Main Features

- Resident management
- Water meter reading management
- Water bill generation and monitoring
- Payment and billing history
- Announcements and notifications
- Service concern/ticket management
- Resident account management
- Password recovery
- User and role management
- Audit logs
- System analytics
- Mobile applications for residents and meter readers
- AI chatbot for resident inquiries

## Technologies Used

- **React**
- **TypeScript**
- **Tailwind CSS**
- **Tauri**
- **React Native / Expo**
- **Supabase**
- **PostgreSQL**
- **Vite**
- **Git / GitHub**

## Setup Instructions

### Prerequisites

Make sure the following are installed on your computer:

- Node.js and npm
- Git
- Rust and Cargo
- Tauri prerequisites
- Expo CLI / Expo development environment
- A Supabase project

### 1. Clone the Repository

```bash
git clone https://github.com/Seive27/BKWB.git
cd BKWB
```

## File Structure Explanation

This section explains the repository layout focused on the desktop and mobile applications grouped by roles. Each role has a dedicated folder under `desktop-app/` or `mobile-app/` with its own README and code.

### desktop-app / roles

- desktop-app/staff/
  - Purpose: Desktop dashboard for Barangay staff to manage residents, meter readings, billing, payments, announcements and reports.
  - Key files and folders:
    - `src/components/` — Reusable UI components (Sidebar.tsx, Header.tsx, StatCard.tsx, RevenueChart.tsx, MeterReadingsTable.tsx, AnnouncementsPanel.tsx)
    - `src/pages/` — Page components (Dashboard.tsx)
    - `electron/` — Electron main and preload scripts (main.js, preload.js)
    - `public/` — Static assets
  - How to run: See `desktop-app/staff/README.md` (npm install, npm run dev, npm run electron:dev)

- desktop-app/super-admin/
  - Purpose: Super Admin dashboard for system-wide management: users, analytics, audit logs, and global settings.
  - Key files and folders:
    - `src/components/` — Admin UI (Sidebar, Dashboard views)
    - `src/pages/` — Dashboard and admin pages
    - Config files: `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.js`
  - How to run: See `desktop-app/super-admin/README.md` (npm install, npm run dev, npm run build)

> Note: Additional desktop roles (if added later) should follow the same pattern: `desktop-app/<role>/` with a README and `src/`.

### mobile-app / roles

- mobile-app/residents/
  - Purpose: Expo-based mobile app for residents to view bills, payments, announcements, and manage their account.
  - Key files and folders:
    - `app/` — App entry and file-based routing (follow Expo Router conventions)
    - `package.json` — Project scripts and dependencies
    - `README.md` — Quick-start and Expo instructions
  - How to run: See `mobile-app/residents/README.md` (npm install, npx expo start)

- mobile-app/meterReader/
  - Purpose: Expo-based mobile app for meter readers to receive assigned readings and submit meter data.
  - Key files and folders:
    - `app/` — App entry and screens for meter-reading workflows
    - `package.json` — Project scripts and dependencies
    - `README.md` — Quick-start and Expo instructions
  - How to run: See `mobile-app/meterReader/README.md` (npm install, npx expo start)

> Note: Both mobile apps are created from the Expo template and use file-based routing. Follow the per-app README for development and testing guidance.


## (Original) Remaining Setup and Contributing

For the rest of setup (backend/Supabase configuration, environment variables, and deployment steps), consult the specific app README files and the `supabase/` directory for database and auth configuration.

If you'd like, I can: add links to the READMEs in this file, or expand the file-structure section with verbatim tree outputs for each role. Tell me which you'd prefer and I'll update the README accordingly.

## Contact

For questions or support, contact:

- Email: arsu.pantinople.swu@phinmaed.com

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
