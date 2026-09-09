import { useBench } from "../context/BenchContext";
import { describePort } from "../lib/serial";

export function ConnectBar() {
  const {
    serialOk,
    connected,
    connecting,
    error,
    knownPorts,
    choosePort,
    connectTo,
    disconnect,
    refreshPorts,
  } = useBench();

  return (
    <div className="border-y border-border bg-panel/80 px-4 py-3 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
          Porta COM
        </span>
        {!serialOk && (
          <p className="text-[13px] text-off">
            Abra esta interface no Chrome ou Edge para listar as portas USB.
          </p>
        )}
        {serialOk && (
          <>
            <select
              className="field-light max-w-[220px]"
              disabled={connecting || knownPorts.length === 0}
              defaultValue=""
              onChange={(event) => {
                const index = Number(event.target.value);
                const port = knownPorts[index];
                if (port) {
                  void connectTo(port);
                }
              }}
            >
              <option value="" disabled>
                {knownPorts.length
                  ? "Portas autorizadas"
                  : "Nenhuma porta autorizada"}
              </option>
              {knownPorts.map((port, index) => (
                <option key={index} value={index}>
                  {describePort(port)}
                </option>
              ))}
            </select>
            <button
              onClick={() => void choosePort()}
              disabled={connecting}
              className="rounded-[10px] bg-run px-3 py-2 text-[12px] leading-none font-medium text-run-foreground ring-1 ring-run/30 active:opacity-90 disabled:opacity-40"
            >
              {connecting ? "Abrindo…" : "Selecionar porta COM"}
            </button>
            <button
              onClick={() => void refreshPorts()}
              disabled={connecting}
              className="rounded-[10px] bg-foreground/5 px-3 py-2 text-[12px] leading-none font-medium text-foreground ring-1 ring-border disabled:opacity-40"
            >
              Atualizar
            </button>
            {connected && (
              <button
                onClick={() => void disconnect()}
                className="rounded-[10px] bg-foreground/5 px-3 py-2 text-[12px] leading-none font-medium text-foreground ring-1 ring-border"
              >
                Desconectar
              </button>
            )}
          </>
        )}
      </div>
      {error && (
        <p className="mt-2 text-[12px] text-off">{error}</p>
      )}
      {!connected && serialOk && (
        <p className="mt-2 text-[12px] text-muted-foreground">
          Escolha a porta COM do ESP32. Enquanto estiver desconectado, os valores
          das bombas permanecem em zero.
        </p>
      )}
    </div>
  );
}
