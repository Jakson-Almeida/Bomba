const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("node:path");
const { execFile, spawn } = require("node:child_process");

let mainWindow = null;
let serialChild = null;
let closingSerial = false;

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function normalizeCom(value) {
  const match = String(value || "")
    .toUpperCase()
    .match(/COM\d+/);
  return match ? match[0] : "";
}

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

function serialHostPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "serial-host.ps1");
  }
  return path.join(__dirname, "serial-host.ps1");
}

function stopSerialChild() {
  const child = serialChild;
  serialChild = null;
  if (!child || child.killed) {
    return;
  }
  try {
    child.stdin.write("__CLOSE__\n");
  } catch {
    /* ignore */
  }
  try {
    child.kill();
  } catch {
    /* ignore */
  }
}

async function closeSerial() {
  closingSerial = true;
  stopSerialChild();
}

function openSerial(portPath) {
  return new Promise((resolve, reject) => {
    const com = normalizeCom(portPath);
    if (!com) {
      reject(new Error("Informe a porta COM."));
      return;
    }

    const child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-STA",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        serialHostPath(),
        "-PortName",
        com,
        "-Baud",
        "115200",
      ],
      { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] },
    );

    serialChild = child;
    let leftover = "";
    let ready = false;
    let stderrText = "";

    const fail = (message) => {
      clearTimeout(timer);
      stopSerialChild();
      reject(new Error(message));
    };

    const timer = setTimeout(() => {
      if (!ready) {
        fail("Tempo esgotado ao abrir a porta COM. Feche o Monitor Serial da IDE e tente de novo.");
      }
    }, 8000);

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      leftover += chunk;
      const lines = leftover.split(/\r?\n/);
      leftover = lines.pop() ?? "";
      for (const line of lines) {
        if (!line) {
          continue;
        }
        if (!ready && line === "__READY__") {
          ready = true;
          clearTimeout(timer);
          resolve();
          continue;
        }
        if (ready) {
          sendToRenderer("serial:data", line);
        }
      }
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      stderrText += chunk;
    });

    child.on("error", (error) => {
      if (!ready) {
        fail(error.message);
      }
    });

    child.on("exit", () => {
      const intentional = closingSerial;
      serialChild = null;
      closingSerial = false;
      if (!ready) {
        fail(
          stderrText.trim() ||
            "Não foi possível abrir a COM. Ela pode estar em uso pelo Arduino IDE.",
        );
        return;
      }
      if (!intentional) {
        sendToRenderer(
          "serial:closed",
          "A porta COM caiu. No ESP32-S3 o USB reinicia ao abrir a serial; tente Conectar de novo.",
        );
      }
    });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 640,
    title: "Painel de Bombas · Litel UFJF",
    backgroundColor: "#eef3f9",
    icon: path.join(__dirname, "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

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

ipcMain.handle("serial:connect", async (_event, portPath) => {
  await closeSerial();
  await openSerial(portPath);
});

ipcMain.handle("serial:disconnect", async () => {
  await closeSerial();
});

ipcMain.handle("serial:write", async (_event, line) => {
  if (!serialChild || !serialChild.stdin.writable) {
    throw new Error("Arduino desconectado.");
  }
  const payload = `${String(line).replace(/\n/g, "")}\n`;
  await new Promise((resolve, reject) => {
    serialChild.stdin.write(payload, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
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
  void closeSerial();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  void closeSerial();
});
