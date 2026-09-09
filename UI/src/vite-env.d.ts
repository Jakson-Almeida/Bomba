/// <reference types="vite/client" />

declare module "*.png" {
  const src: string;
  export default src;
}

type ComPortInfo = {
  path: string;
  label: string;
};

type DesktopSerialApi = {
  listPorts: () => Promise<ComPortInfo[]>;
  connect: (portPath: string) => Promise<void>;
  disconnect: () => Promise<void>;
  write: (line: string) => Promise<void>;
  onData: (handler: (line: string) => void) => () => void;
  onClosed: (handler: (reason: string) => void) => () => void;
};

interface Window {
  bomba?: DesktopSerialApi;
}
