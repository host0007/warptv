const { app, BrowserWindow, Tray, Menu, Notification } = require('electron');
const path = require('path');

// 💀 SINGLE INSTANCE
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;
let tray = null;
let splash = null;
let isQuitting = false;

// 🔇 inicia silencioso quando vier com argumento
const isSilentStartup =
  process.argv.includes('--silent') ||
  process.argv.includes('--hidden') ||
  process.argv.includes('/silent');

// 🚀 server
require('./server.js');

// 🧠 MENU OFF GLOBAL
Menu.setApplicationMenu(null);

// 🟣 SPLASH
function createSplash() {
  splash = new BrowserWindow({
    width: 500,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    transparent: false,
    show: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  splash.loadFile(path.join(__dirname, 'splash.html'));
}

// 🟢 MINI PAINEL PRINCIPAL
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 360,
    height: 240,
    minWidth: 360,
    minHeight: 240,
    maxWidth: 360,
    maxHeight: 240,
    show: false,
    frame: true,
    resizable: false,
    maximizable: false,
    minimizable: true,
    fullscreenable: false,
    skipTaskbar: true,
    autoHideMenuBar: true,
    backgroundColor: '#070b12',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      backgroundThrottling: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'ui.html'));

  mainWindow.once('ready-to-show', () => {
    if (!isSilentStartup) {
      if (splash && !splash.isDestroyed()) {
        splash.webContents.send('splash-fade-out');

        setTimeout(() => {
          if (splash && !splash.isDestroyed()) {
            splash.destroy();
            splash = null;
          }
        }, 450);
      }

      mainWindow.setSkipTaskbar(false);
      mainWindow.show();
      mainWindow.focus();

      new Notification({
        title: 'WarpTV',
        body: 'Rodando em segundo plano 🎬'
      }).show();
    }
  });

  if (isSilentStartup) {
    mainWindow.webContents.once('did-finish-load', () => {
      if (splash && !splash.isDestroyed()) {
        splash.destroy();
        splash = null;
      }
      mainWindow.hide();
      mainWindow.setSkipTaskbar(true);
    });
  }

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
      mainWindow.setSkipTaskbar(true);
    }
  });

  mainWindow.on('minimize', (e) => {
    e.preventDefault();
    mainWindow.hide();
    mainWindow.setSkipTaskbar(true);
  });
}

// 🟡 TRAY
function createTray() {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'icon.ico')
    : path.join(__dirname, 'icon.ico');

  tray = new Tray(iconPath);

  const menu = Menu.buildFromTemplate([
    {
      label: 'Abrir WarpTV',
      click: () => showMainWindow()
    },
    { type: 'separator' },
    {
      label: 'Sair do WarpTV',
      click: () => forceQuit()
    }
  ]);

  tray.setToolTip('WarpTV rodando...');
  tray.setContextMenu(menu);

  tray.on('click', () => showMainWindow());
}

function showMainWindow() {
  if (!mainWindow) return;

  mainWindow.setSkipTaskbar(false);
  mainWindow.show();
  mainWindow.focus();
}

// 🚀 iniciar com Windows em modo silencioso
function setupAutoLaunch() {
  if (!app.isPackaged) return;

  app.setLoginItemSettings({
    openAtLogin: true,
    path: process.execPath,
    args: ['--silent']
  });
}

// 💀 SHUTDOWN LIMPO
function forceQuit() {
  isQuitting = true;

  if (tray) {
    tray.destroy();
    tray = null;
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy();
    mainWindow = null;
  }

  if (splash && !splash.isDestroyed()) {
    splash.destroy();
    splash = null;
  }

  app.quit();
}

// 🔥 focar instância já aberta
app.on('second-instance', () => {
  if (mainWindow) {
    showMainWindow();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.whenReady().then(() => {
  setupAutoLaunch();

  if (!isSilentStartup) {
    createSplash();
  }

  createWindow();
  createTray();
});