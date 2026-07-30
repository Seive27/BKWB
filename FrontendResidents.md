# BKWB Frontend Tracker — Residents

Last updated: July 19, 2026

Living document for the **Residents** mobile app (`mobile-app/residents/`) — what exists, what was built, and what is still pending.

Related: [FrontendMeterReader.md](./FrontendMeterReader.md)

---

## Overview

| App | Path | Stack | Role | Status |
| --- | --- | --- | --- | --- |
| **Residents (mobile)** | `mobile-app/residents/` | Expo 57, React Native, Expo Router, NativeWind | Resident-facing mobile app | **In progress** — core tab screens + quick-action flows UI done |

---

## 1. Purpose

Mobile app for barangay residents to:

- View and pay current water bills
- Browse billing history and payment lists
- Open quick actions (view bills, water schedule, notifications)
- Read service announcements
- View / edit account profile (local UI only)
- Navigate between Dashboard, Bills, Announcements, and Profile

---

## 2. Tech stack (current)

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | Expo SDK ~57 | `expo-router` entry |
| UI | React Native 0.86 + React 19 | |
| Routing | Expo Router (`src/app/`) | File-based routes (minimal — tab shell in `index.tsx`) |
| Styling | **NativeWind v4 + Tailwind CSS 3.4** | `className` on RN components |
| Images / SVG assets | `expo-image` + `require()` | SVG assets loaded as images (not SVG components) |
| Safe areas | `react-native-safe-area-context` | Navbar + header insets |
| Inline SVG | `react-native-svg` | Edit FAB pencil + decorative list icons |
| Language | TypeScript (strict) | Path aliases `@/*` → `src/*`, `@/assets/*` → `assets/*` |

---

## 3. Project structure (relevant)

```
mobile-app/residents/
├── app.json
├── babel.config.js              # NativeWind babel preset
├── metro.config.js              # withNativeWind
├── nativewind-env.d.ts
├── package.json
├── tailwind.config.js           # brand colors + nativewind preset
├── assets/
│   ├── Arrow/
│   │   ├── BackArrow.png
│   │   └── RightArrow.png
│   ├── NavIcon/
│   │   ├── Dashboard.svg
│   │   ├── Bills.svg
│   │   ├── Announcements.svg
│   │   └── Profile.svg
│   ├── QuickActionsIcon/
│   │   ├── ViewBills.svg
│   │   ├── WaterSchedule.svg
│   │   └── Notifications.svg
│   ├── Signs/
│   │   └── Warning.png
│   └── images/                  # Expo template / splash / icons
└── src/
    ├── app/
    │   ├── _layout.tsx          # SafeAreaProvider + Stack (no header)
    │   └── index.tsx            # Tab state → Dashboard / Bills / Announcements / Profile
    ├── components/
    │   ├── ui/
    │   │   ├── Navbar.tsx
    │   │   └── QuickActions.tsx
    │   ├── bills/
    │   │   ├── CurrentBill.tsx
    │   │   ├── BillingHistory.tsx
    │   │   ├── ViewBills.tsx
    │   │   └── BillFilterTabs.tsx
    │   ├── announcements/
    │   │   ├── AnnouncementFilterTabs.tsx
    │   │   └── AnnouncementList.tsx
    │   ├── notifications/
    │   │   ├── NotificationFilterTabs.tsx
    │   │   └── NotificationList.tsx
    │   └── schedule/
    │       └── WaterSchedule.tsx
    ├── screens/
    │   ├── Dashboard.tsx
    │   ├── Bills.tsx
    │   ├── Announcements.tsx
    │   ├── Profile.tsx
    │   ├── ViewBills.tsx        # Quick Action sub-screen
    │   ├── WaterSchedule.tsx    # Quick Action sub-screen
    │   └── Notifications.tsx   # Quick Action sub-screen
    ├── constants/theme.ts
    ├── hooks/
    └── global.css
```

---

## 4. Styling & design tokens

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

---

## 5. Navigation

**Not Expo Router tabs.** Local state in `src/app/index.tsx`:

| Tab | Screen |
| --- | --- |
| `dashboard` | `Dashboard` |
| `bills` | `Bills` |
| `announcements` | `Announcements` |
| `profile` | `Profile` |

**Quick Action sub-stack** (local state inside `Dashboard.tsx`):

| Action | Screen |
| --- | --- |
| View Bills | `ViewBills` |
| Water Schedule | `WaterSchedule` |
| Notifications | `Notifications` |

`onBack` returns to the main Dashboard. Bottom `Navbar` stays visible on all screens.

```
index.tsx (activeTab)
├── Dashboard ──quickAction──► ViewBills | WaterSchedule | Notifications
├── Bills
├── Announcements
└── Profile
```

---

## 6. What was built

### A. Dashboard — `src/screens/Dashboard.tsx`

UI matched to Dashboard mockup. **Static / mock data only**.

1. **Header** — brand blue, safe-area top, `Barangay Kalunasan` / `Good day, Resident`
2. **Current Water Bill card** — Unpaid badge, period, amount `₱450.00`, due date, Pay Now (UI only)
3. **Quick Actions** — wired to sub-screens (View Bills, Water Schedule, Notifications)
4. **Service Announcements** — sample card with left brand accent bar
5. **Edit FAB** — floating brand pencil; no action wired yet
6. **Navbar** — fixed bottom with safe-area padding

### B. Navbar — `src/components/ui/Navbar.tsx`

| Tab key | Label | Asset |
| --- | --- | --- |
| `dashboard` | Dashboard | `assets/NavIcon/Dashboard.svg` |
| `bills` | Bills | `assets/NavIcon/Bills.svg` |
| `announcements` | Announcements | `assets/NavIcon/Announcements.svg` |
| `profile` | Profile | `assets/NavIcon/Profile.svg` |

Active / press → brand blue (`#1E5B8C`); inactive → gray (`#9CA3AF`). Icons via `expo-image` + `require()`.

### C. Quick Actions — `src/components/ui/QuickActions.tsx`

- Top row: View Bills | Water Schedule
- Bottom row: Notifications (full width)
- Callbacks wired from Dashboard to sub-screens

### D. Bills — `src/screens/Bills.tsx`

Section tabs: **Current Bill** | **Billing History**

- `CurrentBill.tsx` — unpaid card, detail rows, Pay Now / View Bill Details, Payment Options panel
- `BillingHistory.tsx` — paid months list, PAID badges, View Receipt buttons

### E. Announcements — `src/screens/Announcements.tsx`

- Filter chips: All / Schedule / Interruptions / Maintenance
- `AnnouncementList.tsx` + `AnnouncementFilterTabs.tsx`
- Mock announcements; Edit FAB present (unwired)

### F. Profile — `src/screens/Profile.tsx`

- Avatar initials, account fields (account number, name, address, contact, email, zone, status)
- Edit / Save / Cancel — **local state only** (resets on remount)
- Mock profile: Juan Dela Cruz, `KLN-2024-1234`, Zone 2, Active

### G. Quick Action screens

| Screen | Components | Notes |
| --- | --- | --- |
| `ViewBills.tsx` | `ViewBills`, `BillFilterTabs` | All / Paid / Unpaid filters; outstanding banner |
| `WaterSchedule.tsx` | `WaterSchedule` | Weekday schedule + weekend maintenance note |
| `Notifications.tsx` | `NotificationList`, `NotificationFilterTabs` | All / Unread; Today / Yesterday groups |

All use back affordance (`assets/Arrow/BackArrow.png`).

### H. App shell

- `src/app/_layout.tsx` — `SafeAreaProvider`, light status bar, headerless `Stack`
- `src/app/index.tsx` — all four primary tabs live

---

## 7. Auth / state

**No authentication.** No Context, Redux, Zustand, AsyncStorage, or API clients.

State is local `useState` only (`activeTab`, filters, profile draft, quick-action screen).

---

## 8. Important technical decisions / pitfalls

| Topic | Decision | Why |
| --- | --- | --- |
| Icons | Asset SVGs via `expo-image` + `require()` | Avoid wrapper icon components; assets live under `assets/` |
| SVG-as-component | Abandoned `react-native-svg-transformer` for runtime icons | Metro returned numeric asset IDs → crash when treating imports as components |
| Styling | NativeWind / Tailwind `className` | Matches desktop Tailwind usage |
| Tab navigation | Local state in `index.tsx` for now | Fast UI iteration; can move to Expo Router tabs later |

---

## 9. How to run

```bash
cd mobile-app/residents
npx expo start -c
```

- `i` — iOS simulator
- `a` — Android emulator / device
- `w` — web
- Or scan QR with Expo Go

Dev server default: `http://localhost:8081`

---

## 10. Backlog / next UI work

- [x] Build **Dashboard** screen UI
- [x] Build **Bills** screen UI and wire Navbar tab
- [x] Bills section tabs: Current Bill + Billing History
- [x] Build **Announcements** screen UI and wire Navbar tab
- [x] Build **Profile** screen UI and wire Navbar tab
- [x] Wire Quick Actions → View Bills / Water Schedule / Notifications screens
- [ ] Wire **Pay Now** / **View Bill Details** / **View Receipt** / **View Details** actions
- [ ] Wire Edit FAB purpose (if staff-only, hide for residents)
- [ ] Wire **Mark all as read** on Notifications
- [ ] Replace mock bill / announcement / profile / schedule data with API
- [ ] Auth / resident session
- [ ] Consider Expo Router tabs instead of local `activeTab` state
- [ ] Confirm SVG `tintColor` looks correct on Android + iOS
- [ ] Fix Water Schedule subtitle copy (currently reuses bills wording)
- [ ] Fix `app.json` icon path warning if unresolved in some environments

---

## 11. Changelog

### 2026-07-18 — Dashboard UI (first pass)

- Set up NativeWind + Tailwind for `mobile-app/residents`
- Built Dashboard UI from mockup PNG
- Built Navbar with safe-area padding, press/hover active blue state
- Built QuickActions using `assets/QuickActionsIcon`
- Wired home route tab switching (Dashboard live; other tabs “Coming soon”)
- Icons from `assets/NavIcon` / `assets/QuickActionsIcon` via `expo-image` + `require()`

### 2026-07-19 — Bills UI

- Built Bills screen; wired `bills` tab
- Current Bill / Billing History section tabs
- Extracted `CurrentBill` and `BillingHistory` under `src/components/bills/`

### 2026-07-19 — Announcements, Profile, Quick Action flows

- Built Announcements screen with category filter tabs + list
- Built Profile screen with local edit / save / cancel
- Built View Bills, Water Schedule, Notifications sub-screens
- Wired Quick Actions from Dashboard to those screens
- Added bill / announcement / notification / schedule component folders
- All four primary Navbar tabs now live

---

## 12. How to update this file

When you finish a screen or major frontend task:

1. Move items from backlog → “What was built” (or mark checkboxes)
2. Add a dated entry under **Changelog**
3. Note any new pitfalls / decisions in the tech section
