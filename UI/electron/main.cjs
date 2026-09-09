const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("node:path");
const { execFile } = require("node:child_process");

let mainWindow = null;
let connectPath = "";

function execPowerShell(script) {
  return new Promise((resolve, reject) => {
    execFile(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", script],
      { windowsHide: true, timeout: 10000 },
      (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(String(stdout || "").trim());
      },
    );
  });
}

function normalizeCom(value) {
  const match = String(value || "")
    .toUpperCase()
    .match(/COM\d+/);
  return match ? match[0] : "";
}

async function listWindowsComPorts() {
  const script = `
$ErrorActionPreference = 'SilentlyContinue'
$ports = @{}
Get-CimInstance Win32_PnPEntity | Where-Object { $_.Name -match '\\(COM\\d+\\)' } | ForEach-Object {
  $id = [regex]::Match($_.Name, 'COM\\d+').Value
  if ($id) { $ports[$id] = $_.Name }
}
try {
  [System.IO.Ports.SerialPort]::GetPortNames() | ForEach-Object {
    if (-not $ports.ContainsKey($_)) { $ports[$_] = $_ }
  }
} catch {}
$ports.GetEnumerator() | Sort-Object Name | ForEach-Object {
  [pscustomobject]@{ path = $_.Key; label = $_.Value }
} | ConvertTo-Json -Compress
`;
  try {
    const raw = await execPowerShell(script);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    return rows
      .map((row) => ({
        path: normalizeCom(row.path) || String(row.path || ""),
        label: String(row.label || row.path || ""),
      }))
      .filter((row) => row.path);
  } catch {
    return [];
  }
}

function attachSerialHandlers(session) {
  session.setPermissionCheckHandler((_webContents, permission) => permission === "serial");
  session.setDevicePermissionHandler((details) => details.deviceType === "serial");
  session.on("select-serial-port", (event, portList, _webContents, callback) => {
    event.preventDefault();
    const wanted = normalizeCom(connectPath);
    const match = portList.find(
      (item) =>
        normalizeCom(item.portName) === wanted ||
        normalizeCom(item.displayName) === wanted,
    );
    callback(match ? match.portId : "");
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 640,
    title: "Painel de Bombas Peristálticas",
    backgroundColor: "#f3f6fb",
    icon: path.join(__dirname, "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  attachSerialHandlers(mainWindow.webContents.session);

  const devUrl = process.env.VITE_DEV_SERVER_URL || process.env.ELECTRON_START_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"), {
      hash: "/",
    });
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

ipcMain.handle("serial:list", async () => listWindowsComPorts());

ipcMain.handle("serial:prepare", async (_event, portPath) => {
  connectPath = normalizeCom(portPath) || String(portPath || "");
  if (!connectPath) {
    throw new Error("Informe a porta COM.");
  }
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
