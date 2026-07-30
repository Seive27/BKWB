# BKWB Frontend Tracker — Meter Reader

Last updated: July 19, 2026

Living document for the **Meter Reader** mobile app (`mobile-app/meterReader/`) — what exists, what was built, and what is still pending.

Related: [FrontendResidents.md](./FrontendResidents.md)

---

## Overview

| App | Path | Stack | Role | Status |
| --- | --- | --- | --- | --- |
| **Meter Reader (mobile)** | `mobile-app/meterReader/` | Expo 57, React Native, Expo Router | Field meter-reading staff app | **Scaffolded** — Expo starter + rename + unused nav icons |

---

## 1. Purpose (intended)

Mobile app for BKWB meter readers / field staff to:

- See assigned reading routes / accounts for the day
- Capture meter readings in the field
- Review reading history
- Manage profile / session

**Current reality:** Still the default Expo SDK 57 starter (“Welcome to Expo” + Explore tutorial). No product screens, auth, API, or offline sync yet.

---

## 2. Tech stack (current)

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | Expo SDK ~57 | `expo-router` entry |
| UI | React Native 0.86 + React 19 | |
| Routing | Expo Router (`src/app/`) | File-based routes + Native Tabs |
| Styling | NativeWind v4 + Tailwind 3 | Same approach as residents; tokens in `tailwind.config.js` |
| Images | `expo-image` | |
| Tabs | `@expo/ui` / `expo-router` Native Tabs | Platform-specific tab components |
| Language | TypeScript (strict) | Path aliases `@/*` → `src/*`, `@/assets/*` → `assets/*` |

**Scripts:** `start`, `android`, `ios`, `web`, `lint`, `reset-project`

**Expo experiments (`app.json`):** `typedRoutes`, `reactCompiler`

---

## 3. Project structure (relevant)

```
mobile-app/meterReader/
├── app.json                     # name/slug/scheme → meterReader
├── package.json
├── tsconfig.json
├── AGENTS.md                    # Use Expo v57 docs
├── README.md                    # Stock Expo README
├── scripts/reset-project.js
├── assets/
│   ├── Nav.icon/                # CUSTOM — unused so far
│   │   ├── dashboard.png
│   │   ├── assigned.png
│   │   ├── history.png
│   │   └── profile.png
│   ├── images/                  # Expo starter icons / splash / tab icons
│   └── expo.icon/               # iOS icon pack
└── src/
    ├── app/
    │   ├── _layout.tsx          # Theme + splash + AppTabs
    │   ├── index.tsx            # Home (Expo starter)
    │   └── explore.tsx          # Explore (Expo starter)
    ├── components/              # Starter UI (themed text, tabs, collapsible, …)
    ├── constants/theme.ts
    ├── hooks/
    └── global.css               # Web font CSS variables
```

---

## 4. Screens & navigation (current)

| Route / tab | File | Role |
| --- | --- | --- |
| App shell | `src/app/index.tsx` | Local `activeTab` state → screen switch (same pattern as residents) |
| Dashboard | `src/screens/Dashboard.tsx` | Meter-reader home (sync status, route, CTAs, stats, progress) |
| Assigned | `src/screens/Assigned.tsx` | Assigned readings list (search, filters, cards) |
| Record Reading | `src/screens/RecordReading.tsx` | Meter entry (opened from Start Reading) |
| History | `src/screens/History.tsx` | Placeholder |
| Profile | `src/screens/Profile.tsx` | Placeholder |

Root layout: `src/app/_layout.tsx` — `SafeAreaProvider` + headerless `Stack` (Expo starter tabs removed).

### Bottom nav (`Navbar`)

| Tab | Asset | Wired to screen |
| --- | --- | --- |
| Dashboard | `assets/Nav.icon/dashboard.png` | Yes |
| Assigned | `assets/Nav.icon/assigned.png` | Yes |
| History | `assets/Nav.icon/history.png` | Placeholder |
| Profile | `assets/Nav.icon/profile.png` | Placeholder |

Component: `src/components/NavBar/Navbar.tsx` — controlled via `activeTab` / `onTabPress`.

Dashboard also uses: `assets/icons/synch.png`, `reading.png`, `totalAssigned.png`.

---

## 5. What was built (BKWB-specific)

| Item | Status |
| --- | --- |
| Expo project scaffold | Done (create-expo-app) |
| App rename (`meterReader` in `app.json` / package) | Done |
| Custom nav icons under `assets/Nav.icon/` | Done |
| Custom bottom `Navbar` (`src/components/NavBar/Navbar.tsx`) | Done — PNG design (gray bar, white active pill), same API pattern as residents |
| **Dashboard** screen | Done — mock data UI from design PNG; Start Reading / Sync All Data actions not wired |
| **Assigned** screen | Done — list + search/filter + cards; Start Reading opens Record Reading |
| **Record Reading** screen | Done — offline banner, resident info, capture/input/notes UI (submit/draft not wired) |
| History / Profile screens | Placeholder stubs (title only) so tab switching works |
| Meter reading capture flow | UI done; camera + submit/sync not wired |
| Auth / offline sync / API | Not started |
| NativeWind + Tailwind (parity with residents) | Done — NativeWind v4 + theme tokens for meter-reader palette |

---

## 6. Scaffolded vs custom

| Category | Scaffolded (Expo) | Custom / BKWB |
| --- | --- | --- |
| App identity | Template | Renamed to meterReader |
| Screens | Home + Explore | Dashboard + Assigned + Record Reading; History/Profile stubs |
| Navigation | Home / Explore tabs | Custom Navbar + index tab switch |
| Components / hooks / theme | Full starter set | Navbar + product screens; starter tabs removed |
| Assets | Template images | `Nav.icon/*` + `icons/*` (sync, reading, totalAssigned) |

**Rough progress:** ~35% product UI (shell + Dashboard + Assigned + Record Reading), actions still mock.

---

## 7. How to run

```bash
cd mobile-app/meterReader
npm install   # if needed
npx expo start -c
```

- `i` — iOS simulator
- `a` — Android emulator / device
- `w` — web
- Or scan QR with Expo Go

Optional: `npm run reset-project` moves starter code to `example/` and blanks `src/app` (useful before building real screens).

---

## 8. Backlog / next UI work

- [x] Strip Expo starter Home / Explore UI (replaced with product shell)
- [x] Custom bottom `Navbar` component (icons + active pill UI)
- [x] Mount `Navbar` via screen-local tabs (`index.tsx` switch)
- [x] Build **Dashboard** screen (UI + mock data)
- [x] Build **Assigned** (routes / accounts for reading) screen
- [x] Build **Record Reading** entry UI (from Start Reading on a card)
- [ ] Build **History** screen
- [ ] Build **Profile** screen
- [ ] Wire Start Reading / Sync All Data actions (Dashboard)
- [ ] Wire camera capture + Submit Reading / Save Draft / sync
- [x] NativeWind / Tailwind (same stack as residents)
- [ ] Align shared Kalunasan brand (`#1E5B8C`) vs meter-reader teal (`#0D4F5C`) if product wants one brand
- [ ] Auth / meter-reader session
- [ ] Offline queue + sync with backend
- [ ] Replace mock / starter data with API

---

## 9. Notes vs Residents app

| Concern | Residents | Meter Reader |
| --- | --- | --- |
| Path | `mobile-app/residents/` | `mobile-app/meterReader/` |
| Styling | NativeWind + Tailwind | NativeWind + Tailwind |
| Tabs | Local state + custom Navbar | Local state + custom Navbar (same pattern) |
| Nav icons | SVG via `expo-image` | PNG under `Nav.icon/` |
| Doc | [FrontendResidents.md](./FrontendResidents.md) | This file |

---

## 10. Changelog

### 2026-07-20 — Assigned + Record Reading

- Built `Assigned.tsx` from design PNG (SYNC ALL header, search, All/Pending/Completed filters, reading cards)
- Built `RecordReading.tsx` from design PNG (offline banner, resident info, capture/input/notes, submit/draft)
- Start Reading on a pending card opens Record Reading; back returns to Assigned
- Maintainable components under `components/assigned/`, `components/recordReading/`, `components/ui/`
- Mock data: `data/mockAssigned.ts`; types: `types/readings.ts`
- Theme: added `alert` tokens for offline/validation states

### 2026-07-20 — NativeWind / Tailwind

- Added NativeWind v4 + Tailwind 3 (`babel.config.js`, `metro.config.js`, `tailwind.config.js`, `nativewind-env.d.ts`)
- Theme tokens: `brand`, `navy`, `sync`, `pending`, `nav`, `surface`
- Converted Navbar + Dashboard + Assigned/History/Profile stubs from StyleSheet → `className`

### 2026-07-20 — Dashboard + app shell

- Built `src/screens/Dashboard.tsx` from design PNG (header sync/date, greeting + route, Start Reading / Sync All Data, stats cards, route progress)
- Wired `src/app/index.tsx` like residents (tab state → Dashboard / Assigned / History / Profile)
- Replaced Expo starter `_layout` with `SafeAreaProvider` + headerless Stack; removed `explore.tsx`
- Assigned / History / Profile are placeholders with Navbar only

### 2026-07-20 — Navbar component

- Added `src/components/NavBar/Navbar.tsx` matching the bottom-nav PNG (rounded gray bar, white active pill, uppercase labels)
- Tabs: Dashboard / Assigned / History / Profile using `assets/Nav.icon/`
- API mirrors residents (`activeTab`, `onTabPress`); now NativeWind `className`

### 2026-07-19 — Tracker created + scaffold noted

- Added this living doc for meterReader
- Project is Expo 57 starter renamed to meterReader
- Custom nav icons dropped under `assets/Nav.icon/` (not wired)
- No product screens yet

---

## 11. How to update this file

When you finish a screen or major frontend task:

1. Move items from backlog → “What was built” (or mark checkboxes)
2. Add a dated entry under **Changelog**
3. Note stack decisions (styling, offline, auth) as they land
