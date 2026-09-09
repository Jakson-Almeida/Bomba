import { BAUD_RATE } from "./calibration";

export type ComPort = {
  path: string;
  label: string;
};

export function serialSupported() {
  return (
    typeof window !== "undefined" &&
    Boolean(window.bomba) &&
    Boolean(navigator.serial)
  );
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
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private open = false;
  private closing = false;
  private leftover = "";
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private onHardwareDisconnect = () => {
    if (!this.closing) {
      this.options.onDisconnect("A porta COM foi fechada.");
    }
  };

  constructor(private options: SerialClientOptions) {}

  get connected() {
    return this.open;
  }

  async connect(portPath: string) {
    if (!window.bomba || !navigator.serial) {
      throw new Error("Abra o aplicativo desktop para usar a porta COM.");
    }
    await this.disconnect();
    this.closing = false;
    this.leftover = "";
    await window.bomba.prepareConnect(portPath);
    let port: SerialPort;
    try {
      port = await navigator.serial.requestPort();
    } catch {
      throw new Error(
        "Não foi possível abrir essa porta COM. Confira se o ESP32 está conectado.",
      );
    }
    await port.open({ baudRate: BAUD_RATE });
    if (!port.readable || !port.writable) {
      await port.close();
      throw new Error("A porta COM não abriu leitura/escrita.");
    }
    this.port = port;
    this.reader = port.readable.getReader();
    this.writer = port.writable.getWriter();
    this.open = true;
    port.addEventListener("disconnect", this.onHardwareDisconnect);
    this.readLoop().catch((error) => {
      this.options.onDisconnect(
        error instanceof Error ? error.message : "Conexão serial encerrada.",
      );
    });
  }

  async write(line: string) {
    if (!this.writer || !this.open) {
      throw new Error("Arduino desconectado.");
    }
    await this.writer.write(this.encoder.encode(`${line}\n`));
  }

  async disconnect() {
    this.closing = true;
    this.open = false;
    const reader = this.reader;
    const writer = this.writer;
    const port = this.port;
    this.reader = null;
    this.writer = null;
    this.port = null;
    try {
      await writer?.write(this.encoder.encode("X\n"));
    } catch {
      /* ignore */
    }
    try {
      await reader?.cancel();
    } catch {
      /* ignore */
    }
    try {
      reader?.releaseLock();
    } catch {
      /* ignore */
    }
    try {
      await writer?.close();
    } catch {
      /* ignore */
    }
    try {
      writer?.releaseLock();
    } catch {
      /* ignore */
    }
    try {
      port?.removeEventListener("disconnect", this.onHardwareDisconnect);
      await port?.close();
    } catch {
      /* ignore */
    }
  }

  private async readLoop() {
    if (!this.reader) {
      return;
    }
    try {
      while (!this.closing) {
        const { value, done } = await this.reader.read();
        if (done) {
          break;
        }
        if (!value) {
          continue;
        }
        this.leftover += this.decoder.decode(value, { stream: true });
        const chunks = this.leftover.split(/\r?\n/);
        this.leftover = chunks.pop() ?? "";
        for (const chunk of chunks) {
          if (chunk) {
            this.options.onLine(chunk);
          }
        }
      }
    } finally {
      if (!this.closing) {
        this.options.onDisconnect("A porta COM foi fechada.");
      }
    }
  }
}
