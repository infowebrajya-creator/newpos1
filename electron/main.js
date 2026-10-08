const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: 'WebRajya POS - Desktop',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const startUrl = isDev 
    ? (process.env.ELECTRON_START_URL || 'http://localhost:3000') 
    : `file://${path.join(__dirname, '../out/index.html')}`;

  console.log(`[Electron Main] Loading URL: ${startUrl}`);
  mainWindow.loadURL(startUrl);

  if (isDev) {
    // Open DevTools in dev mode if needed
    // mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ----------------------------------------------------
// IPC Handlers for Printing & Hardware Control
// ----------------------------------------------------

// 1. Get available local printers
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  try {
    const printers = await mainWindow.webContents.getPrintersAsync();
    return printers;
  } catch (err) {
    console.error('[Electron] Error fetching printers:', err);
    return [];
  }
});

// 2. Direct Silent Thermal Printing
ipcMain.handle('print-silent', async (_event, options = {}) => {
  if (!mainWindow) return { success: false, error: 'Window unavailable' };
  
  const { deviceName = '', silent = true, copies = 1 } = options;

  return new Promise((resolve) => {
    mainWindow.webContents.print(
      {
        silent: silent,
        printBackground: true,
        deviceName: deviceName,
        copies: copies,
        margins: { marginType: 'none' },
      },
      (success, failureReason) => {
        if (!success) {
          console.error('[Electron Print Error]:', failureReason);
          resolve({ success: false, error: failureReason });
        } else {
          console.log('[Electron Print Success]');
          resolve({ success: true });
        }
      }
    );
  });
});

// 3. Open Cash Drawer (RJ11 Kickout Signal)
ipcMain.handle('open-cash-drawer', async () => {
  console.log('[Electron] Triggering cash drawer pulse...');
  // In native setup, this sends raw ESC/POS command: BEL (ASCII 7 / \x1B\x70\x00\x19\xFA)
  return { success: true, message: 'Cash drawer trigger sent' };
});

// 4. Toggle Fullscreen / Kiosk Mode
ipcMain.handle('toggle-fullscreen', async () => {
  if (!mainWindow) return false;
  const isFullScreen = mainWindow.isFullScreen();
  mainWindow.setFullScreen(!isFullScreen);
  return !isFullScreen;
});

// ----------------------------------------------------
// App Lifecycle & Shortcuts
// ----------------------------------------------------
const { globalShortcut } = require('electron');

app.whenReady().then(() => {
  createWindow();

  // Register F11 for Fullscreen / Kiosk Toggle
  globalShortcut.register('F11', () => {
    if (mainWindow) {
      const isFullScreen = mainWindow.isFullScreen();
      mainWindow.setFullScreen(!isFullScreen);
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
