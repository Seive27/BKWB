# Architecture Documentation

## Project Structure

```
desktop-app/staff/
│
├── electron/                    # Electron main process
│   ├── main.js                 # Main Electron entry point
│   └── preload.js              # Preload scripts for security
│
├── src/                        # React application source
│   ├── components/             # Reusable UI components
│   │   ├── Sidebar.tsx         # Left navigation sidebar
│   │   ├── Header.tsx          # Top header with search & profile
│   │   ├── StatCard.tsx        # Dashboard KPI card component
│   │   ├── RevenueChart.tsx    # Monthly collection chart
│   │   ├── MeterReadingsTable.tsx  # Meter readings table
│   │   └── AnnouncementsPanel.tsx  # Announcements sidebar
│   │
│   ├── pages/                  # Page components
│   │   └── Dashboard.tsx       # Main dashboard page
│   │
│   ├── data/                   # Data layer
│   │   └── mockData.ts         # Mock data for development
│   │
│   ├── types/                  # TypeScript definitions
│   │   └── index.ts            # Interface definitions
│   │
│   ├── App.tsx                 # Root application component
│   ├── main.tsx                # React entry point
│   └── index.css               # Global styles & Tailwind
│
├── public/                     # Static assets
│   └── vite.svg                # Favicon
│
├── .vscode/                    # VS Code settings
│   └── extensions.json         # Recommended extensions
│
├── index.html                  # HTML entry point
├── vite.config.ts              # Vite configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── tsconfig.json               # TypeScript configuration
├── package.json                # Dependencies & scripts
├── postcss.config.js           # PostCSS configuration
├── .eslintrc.cjs               # ESLint configuration
├── .gitignore                  # Git ignore rules
│
├── README.md                   # Project overview
├── SETUP.md                    # Installation guide
├── FEATURES.md                 # Features documentation
└── ARCHITECTURE.md             # This file
```

## Technology Stack

### Frontend Framework
- **React 18** - Modern UI library with hooks
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and dev server

### Desktop Framework
- **Electron 29** - Cross-platform desktop application framework
- Main Process: Node.js environment
- Renderer Process: Chromium browser environment

### Styling
- **Tailwind CSS** - Utility-first CSS framework
- **PostCSS** - CSS processing
- **Autoprefixer** - Automatic vendor prefixes

### Data Visualization
- **Recharts** - React chart library built on D3

### Icons
- **Lucide React** - Beautiful, consistent icon set

### Development Tools
- **ESLint** - Code linting
- **TypeScript Compiler** - Type checking
- **Concurrently** - Run multiple commands
- **Wait-on** - Wait for services to be ready

## Component Architecture

### Component Hierarchy

```
App.tsx
├── Sidebar
│   └── Navigation Menu Items
│       └── Logo & Profile Section
│
└── Main Content Area
    ├── Header
    │   ├── Search Bar
    │   ├── Notifications
    │   └── User Profile
    │
    └── Dashboard (or other pages)
        ├── Stats Grid
        │   └── StatCard × 4
        │
        ├── RevenueChart
        │   └── Area Chart Component
        │
        └── Bottom Grid
            ├── MeterReadingsTable
            │   └── Table Rows
            │
            └── AnnouncementsPanel
                └── Announcement Cards
```

## Data Flow

### Current Architecture (Mock Data)

```
mockData.ts → Component Props → Render
```

### Future Architecture (API Integration)

```
API Service → State Management → Components
                ↓
            Local Storage / Cache
```

## State Management

### Current: Component State
- Using React `useState` for local component state
- Props drilling for parent-child communication

### Recommended for Future:
- **Context API** - For global state (user, theme)
- **React Query** - For server state management
- **Zustand/Redux** - For complex app state

## Styling Strategy

### Tailwind CSS Utility Classes
- Responsive design: `sm:`, `md:`, `lg:`, `xl:` prefixes
- State variants: `hover:`, `focus:`, `active:`
- Custom colors defined in `tailwind.config.js`

### Component Styling Pattern
```tsx
<div className="
  bg-white           /* Background */
  rounded-xl         /* Border radius */
  border             /* Border */
  border-gray-200    /* Border color */
  p-6                /* Padding */
  hover:shadow-md    /* Hover effect */
  transition-shadow  /* Smooth transition */
">
  {/* Content */}
</div>
```

## TypeScript Types

### Core Interfaces

```typescript
interface Resident {
  id: string;
  name: string;
  address: string;
  meterId: string;
  status: 'active' | 'inactive';
}

interface MeterReading {
  id: string;
  residentName: string;
  meterId: string;
  currentReading: number;
  previousReading: number;
  consumption: number;
  status: 'normal' | 'high' | 'low';
  date: string;
}

// See src/types/index.ts for complete list
```

## Electron Architecture

### Main Process (`electron/main.js`)
- Creates browser windows
- Handles system-level operations
- Manages app lifecycle
- No direct access to DOM

### Renderer Process (React App)
- Runs the React application
- Handles UI rendering
- Accesses DOM

### Preload Script (`electron/preload.js`)
- Bridge between main and renderer
- Exposes controlled APIs
- Security: Context isolation enabled

### Security Model
```javascript
webPreferences: {
  nodeIntegration: false,      // Disable Node in renderer
  contextIsolation: true,      // Isolate contexts
  preload: path.join(__dirname, 'preload.js')
}
```

## Build Process

### Development Build
1. Vite starts dev server (port 5173)
2. Hot Module Replacement (HMR) enabled
3. Fast refresh for React components
4. Electron loads from localhost

### Production Build
1. `tsc` - TypeScript compilation & type checking
2. `vite build` - Bundles React app
3. `electron-builder` - Packages Electron app
4. Creates platform-specific installers

## Performance Considerations

### Current Optimizations
- Component-level code splitting
- Lazy loading for routes (future)
- Memoization for expensive computations (future)
- Virtual scrolling for large lists (future)

### Bundle Size
- Recharts: ~400kb (chart library)
- Lucide React: Tree-shakeable icons (~50kb used)
- Total production bundle: ~500-600kb

## Security Best Practices

### Implemented
✅ Context isolation in Electron
✅ No nodeIntegration in renderer
✅ Preload script for controlled API access
✅ TypeScript for type safety

### Recommended Additions
- Input validation on all forms
- XSS protection
- CSRF tokens for API calls
- Content Security Policy (CSP)
- Regular dependency updates

## Testing Strategy (Future)

### Unit Tests
- Component testing with React Testing Library
- Utility function tests
- Type tests with TypeScript

### Integration Tests
- API integration tests
- Electron main process tests

### E2E Tests
- User workflow tests with Playwright/Spectron

## Deployment Pipeline (Future)

```
Git Commit → CI/CD → Tests → Build → Sign → Release
                      ↓
              GitHub/GitLab Actions
```

### Release Process
1. Version bump in `package.json`
2. Run tests
3. Build for all platforms
4. Code signing (Windows/Mac)
5. Upload to distribution server
6. Auto-update configuration

## Extension Points

### Adding New Pages
1. Create component in `src/pages/`
2. Add route in `App.tsx`
3. Add menu item in `Sidebar.tsx`

### Adding New Components
1. Create `.tsx` file in `src/components/`
2. Define props interface
3. Export component
4. Import where needed

### Connecting to API
1. Create service layer in `src/services/`
2. Replace mock data with API calls
3. Add loading and error states
4. Implement caching strategy

## Monitoring & Analytics (Future)

- Error tracking (Sentry)
- Usage analytics
- Performance monitoring
- Crash reporting

## Accessibility (WCAG 2.1)

### Current Implementation
- Semantic HTML elements
- Color contrast ratios
- Keyboard navigation
- Focus indicators

### Future Improvements
- Screen reader testing
- ARIA labels
- Skip navigation links
- Reduced motion support
