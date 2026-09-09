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
  prepareConnect: (portPath: string) => Promise<void>;
};

type SerialOptions = {
  baudRate: number;
};

interface SerialPort {
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
  open(options: SerialOptions): Promise<void>;
  close(): Promise<void>;
  addEventListener(type: "disconnect", listener: () => void): void;
  removeEventListener(type: "disconnect", listener: () => void): void;
}

interface Serial {
  requestPort(): Promise<SerialPort>;
}

interface Navigator {
  serial?: Serial;
}

interface Window {
  bomba?: DesktopSerialApi;
}
