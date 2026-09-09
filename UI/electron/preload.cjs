const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("bomba", {
  listPorts: () => ipcRenderer.invoke("serial:list"),
  prepareConnect: (portPath) => ipcRenderer.invoke("serial:prepare", portPath),
});
