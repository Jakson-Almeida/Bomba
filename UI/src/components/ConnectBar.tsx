import { useEffect, useState } from "react";
import { useBench } from "../context/BenchContext";

export function ConnectBar() {
  const {
    serialOk,
    connected,
    connecting,
    error,
    knownPorts,
    connectTo,
    disconnect,
    refreshPorts,
    portLabel,
  } = useBench();
  const [path, setPath] = useState("");

  useEffect(() => {
    if (!path && knownPorts[0]) {
      setPath(knownPorts[0].path);
    }
  }, [knownPorts, path]);

  return (
    <div className="border-y border-border bg-panel/80 px-4 py-3 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
          Porta COM
        </span>
        {!serialOk && (
          <p className="text-[13px] text-off">
            Abra o aplicativo desktop (Electron) para listar as portas COM.
          </p>
        )}
        {serialOk && (
          <>
            <select
              className="field-light max-w-[280px]"
              disabled={connecting || connected}
              value={path}
              onChange={(event) => setPath(event.target.value)}
            >
              {knownPorts.length === 0 && (
                <option value="">Nenhuma porta encontrada</option>
              )}
              {knownPorts.map((port) => (
                <option key={port.path} value={port.path}>
                  {port.label}
                </option>
              ))}
            </select>
            {connected ? (
              <button
                onClick={() => void disconnect()}
                className="rounded-[10px] bg-foreground/5 px-3 py-2 text-[12px] leading-none font-medium text-foreground ring-1 ring-border"
              >
                Desconectar
              </button>
            ) : (
              <button
                onClick={() => {
                  const selected = knownPorts.find((port) => port.path === path);
                  void connectTo(path, selected?.label);
                }}
                disabled={connecting || !path}
                className="rounded-[10px] bg-run px-3 py-2 text-[12px] leading-none font-medium text-run-foreground ring-1 ring-run/30 active:opacity-90 disabled:opacity-40"
              >
                {connecting ? "Abrindo…" : "Conectar"}
              </button>
            )}
            <button
              onClick={() => void refreshPorts()}
              disabled={connecting}
              className="rounded-[10px] bg-foreground/5 px-3 py-2 text-[12px] leading-none font-medium text-foreground ring-1 ring-border disabled:opacity-40"
            >
              Atualizar
            </button>
          </>
        )}
      </div>
      {connected && (
        <p className="mt-2 text-[12px] text-run">Conectado em {portLabel}</p>
      )}
      {error && <p className="mt-2 text-[12px] text-off">{error}</p>}
      {!connected && serialOk && (
        <p className="mt-2 text-[12px] text-muted-foreground">
          Escolha a porta COM do ESP32 e clique em Conectar. Desconectado, os
          valores das bombas permanecem em zero.
        </p>
      )}
    </div>
  );
}
