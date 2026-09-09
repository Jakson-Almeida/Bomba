import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  MOTOR_COUNT,
  clampPwm,
  createDefaultSetpoints,
  flowFromPwm,
  pwmFromFlow,
  pumpName,
  type Calibration,
  type PumpDirection,
  type PumpSetpoint,
} from "../lib/calibration";
import { commands, createEmptyState, parseLine } from "../lib/protocol";
import { SerialClient, listSerialPorts, serialSupported, type ComPort } from "../lib/serial";
import { loadCalibrations, saveCalibrations } from "../lib/storage";

export type DisplayPump = {
  id: number;
  name: string;
  running: boolean;
  direction: PumpDirection;
  pwm: number;
  speed: number;
  calibration: Calibration;
};

type BenchContextValue = {
  serialOk: boolean;
  connected: boolean;
  connecting: boolean;
  portLabel: string;
  error: string | null;
  pumps: DisplayPump[];
  globalPwm: number;
  knownPorts: ComPort[];
  refreshPorts: () => Promise<void>;
  connectTo: (portPath: string, label?: string) => Promise<void>;
  disconnect: () => Promise<void>;
  setPwm: (id: number, pwm: number) => void;
  setDirection: (id: number, direction: PumpDirection) => void;
  toggleRunning: (id: number) => void;
  setEnabled: (id: number, enabled: boolean) => void;
  setCalibration: (id: number, calibration: Calibration) => void;
  setFlow: (id: number, flow: number) => void;
  setGlobalPwm: (pwm: number) => void;
  applyGlobalPwm: (pwm: number) => void;
  stopAll: () => void;
};

const BenchContext = createContext<BenchContextValue | null>(null);

function toDisplay(
  connected: boolean,
  setpoints: PumpSetpoint[],
  calibrations: Calibration[],
): DisplayPump[] {
  return setpoints.map((setpoint, index) => {
    const id = index + 1;
    const pwm = connected ? setpoint.pwm : 0;
    const running = connected && setpoint.enabled;
    return {
      id,
      name: pumpName(id),
      running,
      direction: connected ? setpoint.direction : "forward",
      pwm,
      speed: running ? Math.max(0, flowFromPwm(pwm, calibrations[index])) : 0,
      calibration: calibrations[index],
    };
  });
}

export function BenchProvider({ children }: { children: ReactNode }) {
  const serialOk = serialSupported();
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [portLabel, setPortLabel] = useState("Nenhuma porta");
  const [error, setError] = useState<string | null>(null);
  const [setpoints, setSetpoints] = useState(createDefaultSetpoints);
  const [calibrations, setCalibrations] = useState(loadCalibrations);
  const [globalPwm, setGlobalPwmState] = useState(0);
  const [knownPorts, setKnownPorts] = useState<ComPort[]>([]);

  const clientRef = useRef<SerialClient | null>(null);
  const connectedRef = useRef(false);
  const pwmTimers = useRef<Record<number, number>>({});
  const heartbeatRef = useRef<number | null>(null);
  const helloWaitRef = useRef<((ok: boolean) => void) | null>(null);

  const send = useCallback(async (line: string) => {
    if (!clientRef.current?.connected) {
      return;
    }
    try {
      await clientRef.current.write(line);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao enviar.");
    }
  }, []);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatRef.current !== null) {
      window.clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const dropConnection = useCallback(
    async (reason?: string) => {
      connectedRef.current = false;
      clearHeartbeat();
      Object.values(pwmTimers.current).forEach((timer) =>
        window.clearTimeout(timer),
      );
      pwmTimers.current = {};
      helloWaitRef.current?.(false);
      helloWaitRef.current = null;
      const client = clientRef.current;
      clientRef.current = null;
      if (client) {
        try {
          await client.write(commands.stopAll());
        } catch {
          /* porta já pode ter caído */
        }
        await client.disconnect();
      }
      setConnected(false);
      setConnecting(false);
      setSetpoints(createDefaultSetpoints());
      setGlobalPwmState(0);
      if (reason) {
        setError(reason);
      }
    },
    [clearHeartbeat],
  );

  const refreshPorts = useCallback(async () => {
    if (!serialOk) {
      setKnownPorts([]);
      return;
    }
    setKnownPorts(await listSerialPorts());
  }, [serialOk]);

  const connectTo = useCallback(
    async (portPath: string, label?: string) => {
      setConnecting(true);
      setError(null);
      await dropConnection();
      setConnecting(true);

      const client = new SerialClient({
        onLine: (raw) => {
          const line = parseLine(raw);
          if (!line) {
            return;
          }
          if (line.kind === "hello") {
            helloWaitRef.current?.(true);
            helloWaitRef.current = null;
            return;
          }
          if (line.kind === "error") {
            setError(line.message);
            return;
          }
          if (line.kind === "state" && connectedRef.current) {
            setSetpoints(line.pumps);
          }
        },
        onDisconnect: (reason) => {
          void dropConnection(reason);
        },
      });

      try {
        await client.connect(portPath);
        clientRef.current = client;
        setPortLabel(label || portPath);

        const hello = new Promise<boolean>((resolve) => {
          helloWaitRef.current = resolve;
          window.setTimeout(() => resolve(false), 4000);
        });
        await client.write(commands.hello());
        const ok = await hello;
        if (!ok) {
          throw new Error(
            "A porta não respondeu como interface.ino. Confira o firmware e a COM.",
          );
        }

        connectedRef.current = true;
        setConnected(true);
        await client.write(commands.get());
        heartbeatRef.current = window.setInterval(() => {
          void send(commands.get());
        }, 1500);
        await refreshPorts();
      } catch (caught) {
        await client.disconnect();
        clientRef.current = null;
        connectedRef.current = false;
        setConnected(false);
        setError(
          caught instanceof Error ? caught.message : "Falha ao abrir a porta COM.",
        );
      } finally {
        setConnecting(false);
      }
    },
    [dropConnection, refreshPorts, send],
  );

  const disconnect = useCallback(async () => {
    await dropConnection();
    setError(null);
  }, [dropConnection]);

  const queuePwm = useCallback(
    (id: number, pwm: number) => {
      const previous = pwmTimers.current[id];
      if (previous) {
        window.clearTimeout(previous);
      }
      pwmTimers.current[id] = window.setTimeout(() => {
        delete pwmTimers.current[id];
        void send(commands.pwm(id, pwm));
      }, 80);
    },
    [send],
  );

  const setPwm = useCallback(
    (id: number, pwm: number) => {
      const next = clampPwm(pwm);
      setSetpoints((current) =>
        current.map((pump, index) =>
          index === id - 1 ? { ...pump, pwm: next } : pump,
        ),
      );
      queuePwm(id, next);
    },
    [queuePwm],
  );

  const setDirection = useCallback(
    (id: number, direction: PumpDirection) => {
      setSetpoints((current) =>
        current.map((pump, index) =>
          index === id - 1 ? { ...pump, direction } : pump,
        ),
      );
      void send(commands.direction(id, direction));
    },
    [send],
  );

  const setEnabled = useCallback(
    (id: number, enabled: boolean) => {
      setSetpoints((current) =>
        current.map((pump, index) =>
          index === id - 1 ? { ...pump, enabled } : pump,
        ),
      );
      void send(commands.enable(id, enabled));
    },
    [send],
  );

  const toggleRunning = useCallback(
    (id: number) => {
      const current = setpoints[id - 1];
      if (!current) {
        return;
      }
      const enabled = !current.enabled;
      const pwm = enabled && current.pwm === 0 ? 20 : current.pwm;
      setSetpoints((pumps) =>
        pumps.map((pump, index) =>
          index === id - 1 ? { ...pump, enabled, pwm } : pump,
        ),
      );
      if (pwm !== current.pwm) {
        void send(commands.pwm(id, pwm));
      }
      void send(commands.enable(id, enabled));
    },
    [send, setpoints],
  );

  const setCalibration = useCallback((id: number, calibration: Calibration) => {
    setCalibrations((current) => {
      const next = current.map((item, index) =>
        index === id - 1 ? calibration : item,
      );
      saveCalibrations(next);
      return next;
    });
  }, []);

  const setFlow = useCallback(
    (id: number, flow: number) => {
      const pwm = pwmFromFlow(flow, calibrations[id - 1]);
      setPwm(id, pwm);
    },
    [calibrations, setPwm],
  );

  const setGlobalPwm = useCallback((pwm: number) => {
    setGlobalPwmState(clampPwm(pwm));
  }, []);

  const applyGlobalPwm = useCallback(
    (pwm: number) => {
      const next = clampPwm(pwm);
      setGlobalPwmState(next);
      setSetpoints((current) =>
        current.map((pump) => ({
          ...pump,
          pwm: next,
          enabled: next > 0 || pump.enabled,
        })),
      );
      for (let id = 1; id <= MOTOR_COUNT; id++) {
        void send(commands.pwm(id, next));
        if (next > 0) {
          void send(commands.enable(id, true));
        }
      }
    },
    [send],
  );

  const stopAll = useCallback(() => {
    setSetpoints((current) =>
      current.map((pump) => ({ ...pump, enabled: false, pwm: 0 })),
    );
    setGlobalPwmState(0);
    void send(commands.stopAll());
  }, [send]);

  useEffect(() => {
    void refreshPorts();
  }, [refreshPorts]);

  const dropRef = useRef(dropConnection);
  dropRef.current = dropConnection;

  useEffect(() => {
    return () => {
      void dropRef.current();
    };
  }, []);

  const pumps = useMemo(
    () => toDisplay(connected, setpoints, calibrations),
    [calibrations, connected, setpoints],
  );

  const value = useMemo<BenchContextValue>(
    () => ({
      serialOk,
      connected,
      connecting,
      portLabel,
      error,
      pumps,
      globalPwm: connected ? globalPwm : 0,
      knownPorts,
      refreshPorts,
      connectTo,
      disconnect,
      setPwm,
      setDirection,
      toggleRunning,
      setEnabled,
      setCalibration,
      setFlow,
      setGlobalPwm,
      applyGlobalPwm,
      stopAll,
    }),
    [
      applyGlobalPwm,
      connectTo,
      connected,
      connecting,
      disconnect,
      error,
      globalPwm,
      knownPorts,
      portLabel,
      pumps,
      refreshPorts,
      serialOk,
      setCalibration,
      setDirection,
      setEnabled,
      setFlow,
      setGlobalPwm,
      setPwm,
      stopAll,
      toggleRunning,
    ],
  );

  return <BenchContext.Provider value={value}>{children}</BenchContext.Provider>;
}

export function useBench() {
  const context = useContext(BenchContext);
  if (!context) {
    throw new Error("useBench precisa estar dentro de BenchProvider");
  }
  return context;
}
