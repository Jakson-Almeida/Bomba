import { useEffect, useState } from "react";
import { useBench } from "../context/BenchContext";

export function StatusStrip() {
  const { connected, portLabel } = useBench();
  const [clock, setClock] = useState("--:--:--");

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-between px-5 pt-4 pb-2">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={
            connected
              ? "lamp-run size-1.5 shrink-0 rounded-full bg-run"
              : "size-1.5 shrink-0 rounded-full bg-off/80"
          }
        />
        <span className="truncate text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
          Bancada · {connected ? `Online · ${portLabel}` : "Desconectada"}
        </span>
      </div>
      <span className="shrink-0 font-mono text-[11px] tracking-wider text-faint">
        {clock}
      </span>
    </div>
  );
}
