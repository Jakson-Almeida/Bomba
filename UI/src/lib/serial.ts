export type ComPort = {
  path: string;
  label: string;
};

export function serialSupported() {
  return typeof window !== "undefined" && Boolean(window.bomba);
}

export async function listSerialPorts() {
  if (!window.bomba) {
    return [];
  }
  return window.bomba.listPorts();
}

type SerialClientOptions = {
  onLine: (raw: string) => void;
  onDisconnect: (reason: string) => void;
};

export class SerialClient {
  private stopData: (() => void) | null = null;
  private stopClosed: (() => void) | null = null;
  private open = false;
  private closing = false;

  constructor(private options: SerialClientOptions) {}

  get connected() {
    return this.open;
  }

  async connect(portPath: string) {
    if (!window.bomba) {
      throw new Error("Abra o aplicativo desktop para usar a porta COM.");
    }
    await this.disconnect();
    this.closing = false;
    await window.bomba.connect(portPath);
    this.open = true;
    this.stopData = window.bomba.onData((line) => {
      this.options.onLine(line);
    });
    this.stopClosed = window.bomba.onClosed((reason) => {
      if (this.closing) {
        return;
      }
      this.open = false;
      this.clearListeners();
      this.options.onDisconnect(reason);
    });
  }

  async write(line: string) {
    if (!window.bomba || !this.open) {
      throw new Error("Arduino desconectado.");
    }
    await window.bomba.write(line);
  }

  async disconnect() {
    this.closing = true;
    this.open = false;
    this.clearListeners();
    if (!window.bomba) {
      return;
    }
    try {
      await window.bomba.disconnect();
    } catch {
      /* ignore */
    }
  }

  private clearListeners() {
    this.stopData?.();
    this.stopClosed?.();
    this.stopData = null;
    this.stopClosed = null;
  }
}
