const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("bomba", {
  listPorts: () => ipcRenderer.invoke("serial:list"),
  connect: (portPath) => ipcRenderer.invoke("serial:connect", portPath),
  disconnect: () => ipcRenderer.invoke("serial:disconnect"),
  write: (line) => ipcRenderer.invoke("serial:write", line),
  onData: (handler) => {
    const listener = (_event, line) => handler(line);
    ipcRenderer.on("serial:data", listener);
    return () => ipcRenderer.removeListener("serial:data", listener);
  },
  onClosed: (handler) => {
    const listener = (_event, reason) => handler(reason);
    ipcRenderer.on("serial:closed", listener);
    return () => ipcRenderer.removeListener("serial:closed", listener);
  },
});
