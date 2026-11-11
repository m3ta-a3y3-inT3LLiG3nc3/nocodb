const { app, BrowserWindow, Menu, shell, ipcMain, clipboard, dialog } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow = null;
let currentServerUrl = process.env.NC_SERVER_URL || 'http://localhost:8080';

const isMac = process.platform === 'darwin';

function checkServerReady(url, maxRetries = 20, delayMs = 1000) {
  return new Promise((resolve) => {
    let attempts = 0;
    const test = () => {
      attempts++;
      const req = http.get(`${url}/api/v1/health`, (res) => {
        if (res.statusCode === 200 || res.statusCode === 302 || res.statusCode === 404) {
          resolve(true);
        } else {
          retry();
        }
      });
      req.on('error', () => retry());
      req.setTimeout(1500, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (attempts >= maxRetries) {
        resolve(false);
      } else {
        setTimeout(test, delayMs);
      }
    };

    test();
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 900,
    minHeight: 600,
    title: 'NocoDB',
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: isMac ? { x: 16, y: 16 } : undefined,
    backgroundColor: '#18181b',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      spellcheck: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open external HTTP/HTTPS links in system browser
    if (url.startsWith('http:') || url.startsWith('https:')) {
      if (!url.startsWith(currentServerUrl)) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  loadApplication(currentServerUrl);
}

async function loadApplication(targetUrl) {
  if (!mainWindow) return;

  // Load splash screen first
  mainWindow.loadFile(path.join(__dirname, 'splash.html'), {
    query: { target: targetUrl },
  });

  const isReady = await checkServerReady(targetUrl, 10, 1000);
  if (isReady && mainWindow) {
    mainWindow.loadURL(targetUrl);
  } else if (mainWindow) {
    mainWindow.webContents.send('server-status', {
      connected: false,
      url: targetUrl,
      message: 'Server not detected on ' + targetUrl + '. Please make sure NocoDB server is running.',
    });
  }
}

function getMcpConfig(serverUrl = currentServerUrl, token = '<YOUR_NOCODB_MCP_TOKEN>') {
  return {
    mcpServers: {
      nocodb: {
        url: `${serverUrl}/mcp/${token}`,
        headers: {
          'xc-mcp-token': token,
        },
        description: 'M3ta-Os REA MCP integration for NocoDB spreadsheets and relational bases.',
      },
    },
  };
}

function showMcpDialog() {
  const config = getMcpConfig();
  const configStr = JSON.stringify(config, null, 2);

  dialog
    .showMessageBox(mainWindow, {
      type: 'info',
      title: 'M3ta-Os REA MCP Integration',
      message: 'NocoDB Model Context Protocol (MCP) Configuration',
      detail: `Your NocoDB instance exposes an MCP endpoint for AI agents (M3ta-Os REA, Claude, Cursor, OpenMuse).\n\nEndpoint URL: ${currentServerUrl}/mcp/:mcpTokenId\n\nConfiguration JSON:\n${configStr}`,
      buttons: ['Copy MCP Config JSON', 'Open MCP Docs', 'Close'],
      defaultId: 0,
      cancelId: 2,
    })
    .then(({ response }) => {
      if (response === 0) {
        clipboard.writeText(configStr);
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          message: 'Copied to Clipboard!',
          detail: 'MCP configuration JSON has been copied to your clipboard.',
        });
      } else if (response === 1) {
        shell.openExternal('https://nocodb.com/docs/self-hosting/mcp');
      }
    });
}

function showServerDialog() {
  dialog
    .showMessageBox(mainWindow, {
      type: 'question',
      title: 'NocoDB Server Connection',
      message: 'Current Server Target',
      detail: `Currently connected to: ${currentServerUrl}\n\nTo connect to a custom server URL, launch NocoDB Desktop with NC_SERVER_URL environment variable:\nNC_SERVER_URL="https://your-nocodb-domain.com" npm start`,
      buttons: ['Reload Current Server', 'Close'],
    })
    .then(({ response }) => {
      if (response === 0) {
        loadApplication(currentServerUrl);
      }
    });
}

function buildMenu() {
  const template = [
    ...(isMac
      ? [
          {
            label: app.name,
            submenu: [
              { role: 'about' },
              { type: 'separator' },
              {
                label: 'Server Connection...',
                click: () => showServerDialog(),
              },
              {
                label: 'M3ta-Os MCP Config...',
                accelerator: 'CmdOrCtrl+M',
                click: () => showMcpDialog(),
              },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit' },
            ],
          },
        ]
      : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow && mainWindow.reload(),
        },
        {
          label: 'Force Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => mainWindow && mainWindow.webContents.reloadIgnoringCache(),
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: isMac ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click: () => mainWindow && mainWindow.webContents.toggleDevTools(),
        },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'M3ta-Os MCP',
      submenu: [
        {
          label: 'Show MCP Configuration...',
          accelerator: 'CmdOrCtrl+Shift+M',
          click: () => showMcpDialog(),
        },
        {
          label: 'Copy MCP JSON to Clipboard',
          click: () => {
            const configStr = JSON.stringify(getMcpConfig(), null, 2);
            clipboard.writeText(configStr);
          },
        },
        { type: 'separator' },
        {
          label: 'NocoDB MCP Documentation',
          click: () => shell.openExternal('https://nocodb.com/docs/self-hosting/mcp'),
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
          : [{ role: 'close' }]),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'NocoDB Documentation',
          click: () => shell.openExternal('https://docs.nocodb.com'),
        },
        {
          label: 'Community Discord',
          click: () => shell.openExternal('https://discord.gg/c7GEYrvFtT'),
        },
        {
          label: 'GitHub Repository',
          click: () => shell.openExternal('https://github.com/nocodb/nocodb'),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
ipcMain.handle('get-mcp-config', () => {
  return getMcpConfig();
});

ipcMain.handle('reconnect-server', (_event, newUrl) => {
  if (newUrl && (newUrl.startsWith('http://') || newUrl.startsWith('https://'))) {
    currentServerUrl = newUrl;
  }
  loadApplication(currentServerUrl);
});

app.whenReady().then(() => {
  buildMenu();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});
