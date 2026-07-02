# Quick Start Guide

Get the Kalunasan Waters Staff Dashboard running in 3 steps.

## Prerequisites Check

Before starting, verify you have Node.js installed:

```bash
node --version
```

You should see something like `v18.x.x` or higher. If not, [download Node.js here](https://nodejs.org/).

---

## 🚀 Three Steps to Run

### 1️⃣ Install Dependencies

```bash
npm install
```

**Wait time**: 1-2 minutes

---

### 2️⃣ Start Development Server

**Option A: Browser (Recommended for Development)**
```bash
npm run dev
```

Then open your browser to: **http://localhost:5173**

**Option B: Desktop App**
```bash
npm run electron:dev
```

This will open the full Electron desktop application.

---

### 3️⃣ Start Building! 🎉

The dashboard should now be running. You'll see:
- ✅ Dashboard with statistics
- ✅ Charts and analytics
- ✅ Meter readings table
- ✅ Announcements panel

---

## File Structure At-a-Glance

```
src/
  components/     ← UI components (Sidebar, Header, etc.)
  pages/          ← Dashboard and other pages
  data/           ← Mock data (replace with real API later)
  types/          ← TypeScript interfaces
  App.tsx         ← Main app component
```

---

## Making Changes

### Change Colors
Edit `tailwind.config.js`:
```javascript
colors: {
  primary: {
    600: '#your-color-here',
  }
}
```

### Add Mock Data
Edit `src/data/mockData.ts`

### Modify Components
All components are in `src/components/`

---

## Common Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Run in browser (with hot reload) |
| `npm run electron:dev` | Run as desktop app |
| `npm run build` | Build for production |
| `npm run electron:build` | Create desktop installer |

---

## Need Help?

1. Check **SETUP.md** for detailed installation instructions
2. Check **FEATURES.md** for component documentation
3. Check **ARCHITECTURE.md** for technical details

---

## Next Steps

- [ ] Customize the dashboard with your branding
- [ ] Replace mock data with real API calls
- [ ] Add more pages (Residents, Bills, etc.)
- [ ] Configure Electron app icon and metadata
- [ ] Set up backend API integration

---

## Tips

💡 **Hot Reload**: When running `npm run dev`, changes auto-refresh

💡 **Type Safety**: TypeScript will catch errors before runtime

💡 **Component Reuse**: All UI components are reusable

💡 **Responsive**: Already optimized for 1920×1080 and 1366×768

---

## Troubleshooting One-Liners

**Port already in use?**
```bash
# Kill the process using port 5173 (Windows)
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

**Dependencies not installing?**
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**TypeScript errors?**
```bash
npx tsc --noEmit
```

---

Happy Coding! 🎉
