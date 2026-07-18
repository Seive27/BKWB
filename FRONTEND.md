# BKWB Frontend Tracker

Last updated: July 18, 2026

Living document for Barangay Kalunasan Water Billing (BKWB) frontends — what exists, what was built, and what is still pending.

---

## Overview

| App | Path | Stack | Role | Status |
| --- | --- | --- | --- | --- |
| **Residents (mobile)** | `mobile-app/residents/` | Expo 57, React Native, Expo Router, NativeWind | Resident-facing mobile app | **In progress** — Dashboard + Bills UI done |
| **Staff (desktop)** | `desktop-app/staff/` | React 18, Vite, Electron, Tailwind, Recharts | Staff operations dashboard | Existing (mock data) |
| **Super Admin (desktop)** | `desktop-app/super-admin/` | React 18, Vite, Tailwind | System admin console | Existing (mock data) |

---

## 1. Residents Mobile App (`mobile-app/residents`)

### 1.1 Purpose

Mobile app for barangay residents to:

- View and pay current water bills
- Open quick actions (bills, water schedule, notifications)
- Read service announcements
- Navigate between Dashboard, Bills, Announcements, and Profile

### 1.2 Tech stack (current)

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | Expo SDK ~57 | `expo-router` entry |
| UI | React Native 0.86 + React 19 | |
| Routing | Expo Router (`src/app/`) | File-based routes |
| Styling | **NativeWind v4 + Tailwind CSS 3.4** | `className` on RN components |
| Images / SVG assets | `expo-image` + `require()` | SVG assets loaded as images (not SVG components) |
| Safe areas | `react-native-safe-area-context` | Navbar + header insets |
| Inline SVG | `react-native-svg` | Edit FAB pencil icon only |
| Language | TypeScript (strict) | Path aliases `@/*` → `src/*`, `@/assets/*` → `assets/*` |

### 1.3 Project structure (relevant)

```
mobile-app/residents/
├── app.json
├── babel.config.js              # NativeWind babel preset
├── metro.config.js              # withNativeWind
├── nativewind-env.d.ts
├── package.json
├── tailwind.config.js           # brand colors + nativewind preset
├── assets/
│   ├── NavIcon/
│   │   ├── Dashboard.svg
│   │   ├── Bills.svg
│   │   ├── Announcements.svg
│   │   └── Profile.svg
│   ├── QuickActionsIcon/
│   │   ├── ViewBills.svg
│   │   ├── WaterSchedule.svg
│   │   └── Notifications.svg
│   └── images/                  # Expo template / splash / icons
└── src/
    ├── app/
    │   ├── _layout.tsx          # SafeAreaProvider + Stack (no header)
    │   └── index.tsx            # Tab state → Dashboard / Coming Soon
    ├── components/ui/
    │   ├── Navbar.tsx           # Bottom nav (DONE)
    │   └── QuickActions.tsx     # Quick action grid (DONE)
    ├── components/bills/
    │   ├── CurrentBill.tsx      # Current unpaid bill card (DONE)
    │   └── BillingHistory.tsx   # Paid bills list (DONE)
    ├── screens/
    │   ├── Dashboard.tsx        # Main dashboard UI (DONE)
    │   ├── Bills.tsx            # Water bills UI (DONE)
    │   ├── Announcements.tsx    # Placeholder (empty)
    │   └── Profile.tsx          # Placeholder (empty)
    ├── constants/theme.ts
    ├── hooks/
    ├── global.css               # @tailwind directives
    └── ...
```

### 1.4 Styling & design tokens

Configured in `tailwind.config.js`:

| Token | Value | Usage |
| --- | --- | --- |
| `brand` / `brand.DEFAULT` | `#1E5B8C` | Header, Pay Now, bill amount, active nav, FAB, accent bar |
| `brand.dark` | `#174A73` | Pressed Pay Now (`active:bg-brand-dark`) |
| `brand.light` | `#2B6FA3` | Reserved |
| Page background | `bg-slate-50` | Screen canvas |
| Cards | `bg-white` + soft shadow | Bill card, quick actions, announcements |
| Inactive nav | `#9CA3AF` | Icon tint + label |

NativeWind setup files:

- `src/global.css` — `@tailwind base/components/utilities`
- `babel.config.js` — `jsxImportSource: "nativewind"` + `nativewind/babel`
- `metro.config.js` — `withNativeWind(..., { input: './src/global.css' })`
- `app.json` — web `bundler: "metro"`

### 1.5 What was built (session work)

#### A. Dashboard screen — `src/screens/Dashboard.tsx`

UI matched to the provided Dashboard PNG mockup. **Static / mock data only** (no API yet).

Sections:

1. **Header**
   - Brand blue background (`bg-brand`)
   - Respects top safe area (`paddingTop: insets.top + 16`)
   - Title: `Barangay Kalunasan`
   - Subtitle: `Good day, Resident`

2. **Current Water Bill card**
   - Title + **Unpaid** badge (red/coral)
   - Period: `January 2026`
   - Amount: `₱450.00` (brand blue, large)
   - Due: `February 15, 2026`
   - Full-width **Pay Now** button (UI only — no payment flow)

3. **Quick Actions**
   - Renders `<QuickActions />` (see below)

4. **Service Announcements**
   - Section title
   - One sample card: left brand accent bar, date `February 5, 2026`, title `Scheduled Water Interruption`

5. **Edit FAB**
   - Floating brand button (bottom-right, above navbar)
   - Pencil icon via `react-native-svg`
   - No action wired yet

6. **Navbar**
   - Fixed at bottom; scroll content padded so it clears the bar + home indicator

#### B. Navbar — `src/components/ui/Navbar.tsx`

Bottom tab bar with four items:

| Tab key | Label | Asset |
| --- | --- | --- |
| `dashboard` | Dashboard | `assets/NavIcon/Dashboard.svg` |
| `bills` | Bills | `assets/NavIcon/Bills.svg` |
| `announcements` | Announcements | `assets/NavIcon/Announcements.svg` |
| `profile` | Profile | `assets/NavIcon/Profile.svg` |

Behavior:

- Icons loaded with `expo-image` + `require(...)` from assets (no wrapper icon component files)
- Active / press / hover → icon `tintColor` + label turn brand blue (`#1E5B8C`)
- Inactive → gray (`#9CA3AF`)
- Absolute bottom positioning
- `paddingBottom: Math.max(insets.bottom, 8)` so the bar sits **above the phone home indicator / system nav**
- Props: `activeTab`, `onTabPress`

#### C. Quick Actions — `src/components/ui/QuickActions.tsx`

Layout:

- Top row: **View Bills** | **Water Schedule** (side by side)
- Bottom row: **Notifications** (full width)

Icons from:

- `assets/QuickActionsIcon/ViewBills.svg`
- `assets/QuickActionsIcon/WaterSchedule.svg`
- `assets/QuickActionsIcon/Notifications.svg`

Optional callbacks (not wired to navigation yet): `onViewBills`, `onWaterSchedule`, `onNotifications`.

#### D. App shell / navigation wiring

- `src/app/_layout.tsx` — `SafeAreaProvider`, light status bar, headerless `Stack`
- `src/app/index.tsx` — local `activeTab` state
  - `dashboard` → full `Dashboard` screen
  - `bills` → full `Bills` screen
  - other tabs → temporary **Coming soon** placeholders (still show `Navbar`)

Screen files `Announcements.tsx` and `Profile.tsx` still empty placeholders.

#### E. Bills screen — `src/screens/Bills.tsx`

UI matched to the Water Bills mockups (Current Bill + Billing History). **Static / mock data only**.

Shell:

1. **Header** — `Water Bills` / `Billing statements and payment history`
2. **Section tabs** — `Current Bill` | `Billing History` (underline active state)
3. **Edit FAB** + **Navbar** (Bills tab active)

Tab content components:

- `src/components/bills/CurrentBill.tsx` — unpaid February 2026 card (`₱450.00`), detail rows, Pay Now / View Bill Details, Payment Options panel
- `src/components/bills/BillingHistory.tsx` — list of paid months (Jan 2026 → Oct 2025) with green **PAID** badge, amount / paid-on rows, **View Receipt** outline button

### 1.6 Important technical decisions / pitfalls

| Topic | Decision | Why |
| --- | --- | --- |
| Icons | Use asset SVGs via `expo-image` + `require()` | User asked **not** to create `NavIcons.tsx` / `QuickActionIcons.tsx`; assets already live under `assets/` |
| SVG-as-component | Abandoned `react-native-svg-transformer` for runtime icons | Metro returned numeric asset IDs → crash: *Element type is invalid… got: number* when treating imports as components (conflicts easily with NativeWind’s Metro wrapper) |
| Styling | NativeWind / Tailwind `className` | Explicit request; matches desktop Tailwind usage |
| Tab navigation | Local state in `index.tsx` for now | Fast UI iteration; can move to Expo Router tabs later |

### 1.7 How to run

```bash
cd mobile-app/residents
npx expo start -c
```

- `i` — iOS simulator  
- `a` — Android emulator / device  
- `w` — web  
- Or scan QR with Expo Go  

Dev server default: `http://localhost:8081`

### 1.8 Residents — backlog / next UI work

- [x] Build **Bills** screen UI (`src/screens/Bills.tsx`) and wire Navbar tab
- [x] Bills section tabs: Current Bill + Billing History components
- [ ] Build **Announcements** screen UI (`src/screens/Announcements.tsx`) and wire Navbar tab
- [ ] Build **Profile** screen UI (`src/screens/Profile.tsx`) and wire Navbar tab
- [ ] Wire **Pay Now** / **View Bill Details** / **View Receipt** actions
- [ ] Wire Quick Actions presses to real screens / flows
- [ ] Wire Edit FAB purpose (if staff-only, hide for residents)
- [ ] Replace mock bill / announcement data with API
- [ ] Auth / resident session
- [ ] Consider Expo Router tabs instead of local `activeTab` state
- [ ] Confirm SVG `tintColor` looks correct on Android + iOS (fallback if needed)
- [ ] Fix `app.json` icon path warning if `assets/images/icon.png` missing/unresolved in some environments

---

## 2. Staff Desktop App (`desktop-app/staff`)

### 2.1 Purpose

Electron + web staff dashboard for Kalunasan Waters operations.

### 2.2 Stack

- React 18, Vite, TypeScript
- Tailwind CSS
- Electron (desktop shell)
- React Router, Lucide icons, Recharts

### 2.3 Known pages / areas (existing)

Under `desktop-app/staff/src/pages/` and components:

- Dashboard
- Residents
- Meter Readings
- Bills
- Payments
- Announcements
- Messages
- Reports
- Profile Settings

Uses mock data modules (e.g. `src/data/mockData.ts`, `mockMessages.ts`, `mockProfile.ts`).

### 2.4 Staff — tracking notes

- [ ] Document current feature completeness per page (as needed)
- [ ] Note API integration status when backend is connected
- [ ] Keep UI consistency with brand blue where shared with residents app

---

## 3. Super Admin Desktop App (`desktop-app/super-admin`)

### 3.1 Purpose

Web console for system-level administration (users, analytics, audit logs, settings, broadcasts).

### 3.2 Stack

- React 18, Vite, TypeScript
- Tailwind CSS
- Lucide icons

### 3.3 Known pages / areas (existing)

Under `desktop-app/super-admin/src/pages/`:

- Dashboard
- Users
- Analytics
- Audit Logs / Audit Logs Console
- System Settings

Notable modals: Add User, Broadcast Now, Export Report, Export Audit Logs.

Uses mock data (`src/data/mockData.ts`).

### 3.4 Super Admin — tracking notes

- [ ] Document feature completeness per page (as needed)
- [ ] Note API integration status when backend is connected

---

## 4. Cross-frontend conventions (recommended)

| Concern | Convention |
| --- | --- |
| Brand primary | Prefer `#1E5B8C` (residents `brand`) for shared Kalunasan Waters blue |
| Currency | Philippine peso `₱` |
| Locale context | Barangay Kalunasan water billing |
| Styling | Tailwind (web) / NativeWind (mobile) |
| Mock → API | Keep UI working with mock until endpoints exist; isolate data layer |

---

## 5. Changelog (frontend work log)

### 2026-07-18 — Residents Dashboard UI (first pass)

- Set up NativeWind + Tailwind for `mobile-app/residents`
- Built Dashboard UI from mockup PNG
- Built Navbar with safe-area padding, press/hover active blue state
- Built QuickActions using `assets/QuickActionsIcon`
- Wired home route tab switching (Dashboard live; other tabs “Coming soon”)
- Removed custom `NavIcons.tsx` / `QuickActionIcons.tsx`; load icons from `assets/NavIcon` and `assets/QuickActionsIcon` via `expo-image`
- Fixed SVG import crash (asset number treated as component) by using `require()` + `Image` instead of SVG-as-React-component

### 2026-07-19 — Residents Bills UI

- Built Bills screen UI from Water Bills mockup PNG
- Wired `bills` tab in `src/app/index.tsx` to the live `Bills` screen
- Mock bill card: amount due, unpaid status, account details, Pay Now / View Bill Details
- Payment Options info panel with barangay hall / centers / online banking
- Added Current Bill / Billing History section tabs
- Extracted `CurrentBill` and `BillingHistory` components under `src/components/bills/`
- Billing History list with PAID badges and View Receipt buttons (mock data)

---

## 6. How to update this file

When you finish a screen or major frontend task:

1. Move items from backlog → “What was built” (or mark checkboxes)
2. Add a dated entry under **Changelog**
3. Note any new pitfalls / decisions in the relevant tech section
