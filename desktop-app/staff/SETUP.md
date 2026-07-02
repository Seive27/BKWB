# Setup Guide - Kalunasan Waters Staff Dashboard

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** (optional, for version control)

## Step-by-Step Installation

### 1. Install Dependencies

Open your terminal in the project directory and run:

```bash
npm install
```

This will install all required packages including:
- React & React DOM
- TypeScript
- Electron
- Tailwind CSS
- Recharts (for charts)
- Lucide React (for icons)
- Vite (build tool)

### 2. Development Mode

#### Option A: Web Development (Faster, Hot Reload)

Run the app in a browser for faster development:

```bash
npm run dev
```

This will start the development server at `http://localhost:5173`

#### Option B: Electron Desktop App

Run the full desktop application:

```bash
npm run electron:dev
```

This will:
1. Start the Vite dev server
2. Wait for it to be ready
3. Launch the Electron window

**Note**: The first launch may take a moment while dependencies are loaded.

### 3. Build for Production

To create a distributable desktop application:

```bash
npm run electron:build
```

The installer will be created in the `dist-electron` folder.

## Troubleshooting

### Issue: "Module not found" errors

**Solution**: Clear cache and reinstall:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Issue: Electron window doesn't open

**Solution**: Make sure the dev server is running first:
```bash
# Terminal 1
npm run dev

# Terminal 2 (wait for Terminal 1 to show "ready")
npx electron .
```

### Issue: Port 5173 is already in use

**Solution**: Kill the process using that port or change the port in `vite.config.ts`:
```typescript
server: {
  port: 5174, // Change to different port
}
```

### Issue: Styles not loading

**Solution**: Rebuild Tailwind CSS:
```bash
npm run build
```

## Development Tips

### Hot Reload

When running `npm run dev`, changes to `.tsx` and `.css` files will automatically reload in the browser.

### TypeScript Errors

Run type checking:
```bash
npx tsc --noEmit
```

### Linting

Check for code quality issues:
```bash
npx eslint src --ext ts,tsx
```

## Project Configuration

### Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`):
```
NODE_ENV=development
```

### VS Code Extensions (Recommended)

- **Tailwind CSS IntelliSense** - Autocomplete for Tailwind classes
- **ESLint** - Code quality checking
- **Prettier** - Code formatting

## Next Steps

1. **Customize the App**: Modify components in `src/components/`
2. **Add Pages**: Create new pages in `src/pages/`
3. **Update Data**: Replace mock data in `src/data/mockData.ts` with real API calls
4. **Styling**: Adjust colors and theme in `tailwind.config.js`

## Deployment

### Windows Installer

The build process creates an NSIS installer for Windows:
- Located in: `dist-electron/`
- File format: `.exe`

### Mac DMG (requires Mac)

Configure in `package.json` under `build.mac` section.

### Linux AppImage/deb

Configure in `package.json` under `build.linux` section.

## Need Help?

- Check the main README.md for project overview
- Review component documentation in each `.tsx` file
- Check the [Electron documentation](https://www.electronjs.org/docs)
- Check the [React documentation](https://react.dev/)
