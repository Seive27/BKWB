# 🚀 Get Started in 5 Minutes

This guide will get you up and running with the Kalunasan Waters Staff Dashboard quickly.

---

## Prerequisites

✅ **Node.js installed** (v18 or higher)  
Check by running: `node --version`

If not installed: Download from [nodejs.org](https://nodejs.org/)

---

## Step 1: Install Dependencies

Open your terminal in the project folder and run:

```bash
npm install
```

⏱️ **Wait time**: 1-2 minutes

---

## Step 2: Start the Application

### Option A: Web Browser (Recommended for Development)

```bash
npm run dev
```

Then open: **http://localhost:5173**

### Option B: Desktop App

```bash
npm run electron:dev
```

This will launch the Electron desktop window.

---

## Step 3: Explore the Dashboard

You should now see:

✅ **Left Sidebar** - Navigation menu with 8 sections  
✅ **Top Header** - Search bar, notifications, user profile  
✅ **Dashboard Cards** - 4 KPI statistics  
✅ **Revenue Chart** - Monthly collection analytics  
✅ **Meter Readings Table** - Recent readings  
✅ **Announcements Panel** - Latest updates  

---

## What You Have Now

### ✅ Working Features

- Modern dashboard interface
- Responsive sidebar navigation
- Statistics cards with growth indicators
- Interactive revenue chart
- Searchable meter readings table
- Announcements panel with categories
- Beautiful UI with Tailwind CSS
- TypeScript type safety

### 🔨 Next Steps

1. **Customize the UI** - Change colors in `tailwind.config.js`
2. **Add Real Data** - Replace mock data in `src/data/mockData.ts`
3. **Build Other Pages** - Follow `DEVELOPMENT_CHECKLIST.md`
4. **Connect API** - Create service layer in `src/services/`

---

## Quick File Navigation

| Want to... | Edit this file... |
|------------|-------------------|
| Change colors | `tailwind.config.js` |
| Update mock data | `src/data/mockData.ts` |
| Modify sidebar menu | `src/components/Sidebar.tsx` |
| Change header | `src/components/Header.tsx` |
| Edit dashboard layout | `src/pages/Dashboard.tsx` |
| Add new pages | `src/pages/` (create new file) |

---

## Common Tasks

### Change the App Name

Edit `package.json`:
```json
{
  "name": "your-app-name",
  "productName": "Your App Display Name"
}
```

### Change Primary Color

Edit `tailwind.config.js`:
```javascript
colors: {
  primary: {
    600: '#yourcolor',
  }
}
```

### Add a New Menu Item

Edit `src/components/Sidebar.tsx`:
```typescript
const menuItems = [
  // ... existing items
  { id: 'new-page', label: 'New Page', icon: YourIcon },
];
```

### Update Mock Data

Edit `src/data/mockData.ts`:
```typescript
export const dashboardStats = {
  totalResidents: 2000, // Change these values
  billsGenerated: 1500,
  // ... etc
};
```

---

## Need Help?

📖 **Read the Documentation**

- `README.md` - Project overview
- `QUICKSTART.md` - Fast setup guide
- `SETUP.md` - Detailed installation
- `FEATURES.md` - Feature documentation
- `ARCHITECTURE.md` - Technical details
- `DEVELOPMENT_CHECKLIST.md` - Development roadmap

🐛 **Troubleshooting**

If you encounter issues, check `SETUP.md` for troubleshooting tips.

---

## What's Included?

### 📦 Technologies

- React 18 (UI library)
- TypeScript (Type safety)
- Electron (Desktop framework)
- Tailwind CSS (Styling)
- Recharts (Charts)
- Lucide React (Icons)
- Vite (Build tool)

### 📁 Project Structure

```
src/
├── components/     ← UI components
├── pages/          ← Page components
├── data/           ← Mock data
├── types/          ← TypeScript types
└── App.tsx         ← Main app
```

### 🎨 Components Available

1. **Sidebar** - Navigation menu
2. **Header** - Top bar with search
3. **StatCard** - KPI display card
4. **RevenueChart** - Area chart
5. **MeterReadingsTable** - Data table
6. **AnnouncementsPanel** - Announcement list

---

## Development Workflow

### 1. Make Changes
Edit files in `src/` folder

### 2. See Changes
Changes automatically reload in browser (hot reload)

### 3. Test
Check the browser/desktop app

### 4. Build for Production
```bash
npm run electron:build
```

---

## Quick Commands Reference

```bash
# Install dependencies
npm install

# Development (browser)
npm run dev

# Development (desktop app)
npm run electron:dev

# Build for production
npm run build

# Package desktop app
npm run electron:build

# Type checking
npx tsc --noEmit

# Linting
npx eslint src
```

---

## Keyboard Shortcuts (Future)

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Open search |
| `Ctrl + B` | Toggle sidebar |
| `Ctrl + ,` | Open settings |
| `Ctrl + N` | New record |

*Not yet implemented - add as needed*

---

## Resources

- [React Docs](https://react.dev/)
- [TypeScript Docs](https://www.typescriptlang.org/)
- [Tailwind CSS Docs](https://tailwindcss.com/)
- [Electron Docs](https://electronjs.org/)
- [Recharts Docs](https://recharts.org/)

---

## Support

For questions or issues:
1. Check documentation files
2. Review code comments
3. Check console for errors
4. Search for similar issues online

---

## You're Ready! 🎉

Your development environment is set up and ready to go. Start building!

**Happy Coding!** 💻✨
