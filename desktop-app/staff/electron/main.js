const { app, BrowserWindow } = require('electron');
const path = require('path');

async function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    minWidth: 1366,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, '../public/icon.png')
  });

  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    // Try to find which port Vite is running on
    const ports = [5173, 5174, 5175];
    let loaded = false;
    
    for (const port of ports) {
      try {
        await mainWindow.loadURL(`http://localhost:${port}`);
        console.log(`Connected to Vite dev server on port ${port}`);
        loaded = true;
        break;
      } catch (err) {
        console.log(`Port ${port} not available, trying next...`);
      }
    }
    
    if (!loaded) {
      console.error('Could not connect to Vite dev server on any port');
      await mainWindow.loadURL('http://localhost:5173'); // Default fallback
    }
    
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
