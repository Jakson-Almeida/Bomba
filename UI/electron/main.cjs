const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("node:path");
const { SerialPort } = require("serialport");
const { ReadlineParser } = require("@serialport/parser-readline");

const BAUD_RATE = 115200;

let mainWindow = null;
let serialPort = null;
let serialParser = null;
let closingSerial = false;

function sendToRenderer(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

async function closeSerial() {
  const current = serialPort;
  serialPort = null;
  serialParser = null;
  if (!current) {
    return;
  }
  closingSerial = true;
  try {
    if (current.isOpen) {
      await new Promise((resolve) => {
        current.write("X\n", () => resolve());
      });
    }
  } catch {
    /* ignore */
  }
  await new Promise((resolve) => {
    current.close(() => resolve());
  });
  closingSerial = false;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 900,
    minHeight: 640,
    title: "Painel de Bombas Peristálticas",
    backgroundColor: "#f3f6fb",
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
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

ipcMain.handle("serial:list", async () => {
  const ports = await SerialPort.list();
  return ports.map((port) => ({
    path: port.path,
    label: [port.path, port.friendlyName || port.manufacturer]
      .filter(Boolean)
      .filter((value, index, all) => all.indexOf(value) === index)
      .join(" — "),
  }));
});

ipcMain.handle("serial:connect", async (_event, portPath) => {
  if (!portPath || typeof portPath !== "string") {
    throw new Error("Informe a porta COM.");
  }
  await closeSerial();

  const port = new SerialPort({
    path: portPath,
    baudRate: BAUD_RATE,
    autoOpen: false,
  });

  await new Promise((resolve, reject) => {
    port.open((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });

  const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));
  parser.on("data", (line) => {
    sendToRenderer("serial:data", String(line).replace(/\r/g, ""));
  });
  port.on("close", () => {
    serialPort = null;
    serialParser = null;
    if (!closingSerial) {
      sendToRenderer("serial:closed", "A porta COM foi fechada.");
    }
  });
  port.on("error", (error) => {
    if (!closingSerial) {
      sendToRenderer("serial:closed", error.message || "Erro na porta COM.");
    }
  });

  serialPort = port;
  serialParser = parser;
});

ipcMain.handle("serial:disconnect", async () => {
  await closeSerial();
});

ipcMain.handle("serial:write", async (_event, line) => {
  if (!serialPort || !serialPort.isOpen) {
    throw new Error("Arduino desconectado.");
  }
  const payload = `${String(line).replace(/\n/g, "")}\n`;
  await new Promise((resolve, reject) => {
    serialPort.write(payload, (error) => {
      if (error) {
        reject(error);
        return;
      }
      serialPort.drain((drainError) => {
        if (drainError) {
          reject(drainError);
          return;
        }
        resolve();
      });
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
  void closeSerial().finally(() => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
});

app.on("before-quit", () => {
  void closeSerial();
});
