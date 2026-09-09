import { BAUD_RATE } from "./calibration";
import { parseLine, type ParsedLine } from "./protocol";

export function serialSupported() {
  return typeof navigator !== "undefined" && Boolean(navigator.serial);
}

export async function listSerialPorts() {
  if (!navigator.serial) {
    return [];
  }
  return navigator.serial.getPorts();
}

export async function requestSerialPort() {
  if (!navigator.serial) {
    throw new Error("Este navegador não expõe portas COM. Use Chrome ou Edge.");
  }
  return navigator.serial.requestPort();
}

export function describePort(port: SerialPort) {
  const info = port.getInfo();
  if (info.usbVendorId && info.usbProductId) {
    const vid = info.usbVendorId.toString(16).padStart(4, "0");
    const pid = info.usbProductId.toString(16).padStart(4, "0");
    return `USB ${vid}:${pid}`;
  }
  return "Porta COM";
}

type SerialClientOptions = {
  onLine: (line: ParsedLine) => void;
  onDisconnect: (reason: string) => void;
};

export class SerialClient {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private closed = true;
  private leftover = "";
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  constructor(private options: SerialClientOptions) {}

  get connected() {
    return !this.closed && this.port !== null;
  }

  async connect(port: SerialPort) {
    await this.disconnect();
    this.port = port;
    await port.open({ baudRate: BAUD_RATE });
    if (!port.readable || !port.writable) {
      await port.close();
      throw new Error("A porta COM não abriu leitura/escrita.");
    }
    this.reader = port.readable.getReader();
    this.writer = port.writable.getWriter();
    this.closed = false;
    this.leftover = "";
    this.readLoop().catch((error) => {
      this.options.onDisconnect(
        error instanceof Error ? error.message : "Conexão serial encerrada.",
      );
    });
  }

  async write(line: string) {
    if (!this.writer || this.closed) {
      throw new Error("Arduino desconectado.");
    }
    await this.writer.write(this.encoder.encode(`${line}\n`));
  }

  async disconnect() {
    this.closed = true;
    const reader = this.reader;
    const writer = this.writer;
    const port = this.port;
    this.reader = null;
    this.writer = null;
    this.port = null;
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
      while (!this.closed) {
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
          const parsed = parseLine(chunk);
          if (parsed) {
            this.options.onLine(parsed);
          }
        }
      }
    } finally {
      if (!this.closed) {
        this.options.onDisconnect("A porta COM foi fechada.");
      }
    }
  }
}
