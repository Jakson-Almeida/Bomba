import { Link } from "@tanstack/react-router";
import { ConnectBar } from "../components/ConnectBar";
import { StatusStrip } from "../components/StatusStrip";
import { useBench } from "../context/BenchContext";

export function IndexPage() {
  const {
    connected,
    pumps,
    globalPwm,
    applyGlobalPwm,
    setGlobalPwm,
    stopAll,
  } = useBench();
  const activeCount = pumps.filter((pump) => pump.running).length;

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col">
      <StatusStrip />
      <header className="px-5 pt-2 pb-4">
        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.3em] text-faint uppercase">
            Peristaltic Array
          </p>
          <h1 className="mt-1 text-[28px] leading-none font-semibold text-balance">
            Bombas de Fluxo
          </h1>
          <p className="mt-2 text-[13px] text-muted-foreground">
            {activeCount} ativas · {pumps.length - activeCount} paradas · PWM 12
            bits
          </p>
        </div>
      </header>

      <ConnectBar />

      <div className="sticky top-0 z-20 border-b border-border bg-panel/70 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center justify-between">
              <span className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                PWM global
              </span>
              <span className="font-mono text-[12px] text-run">
                {globalPwm.toFixed(1)} %
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={0.1}
              value={globalPwm}
              disabled={!connected}
              aria-label="PWM global"
              onChange={(event) => setGlobalPwm(Number(event.target.value))}
              onPointerUp={(event) =>
                applyGlobalPwm(Number(event.currentTarget.value))
              }
              onKeyUp={(event) =>
                applyGlobalPwm(Number(event.currentTarget.value))
              }
              className="slider-run"
            />
          </div>
          <button
            onClick={stopAll}
            disabled={!connected}
            className="shrink-0 rounded-[10px] bg-foreground/8 px-3 py-2 text-[12px] leading-none font-medium text-foreground ring-1 ring-border active:bg-foreground/15 disabled:opacity-40"
          >
            Parar tudo
          </button>
        </div>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 px-4 py-4 pb-10 sm:grid-cols-2 lg:grid-cols-3">
        {pumps.map((pump) => (
          <Link
            key={pump.id}
            to="/bomba/$id"
            params={{ id: String(pump.id) }}
            className="rounded-[16px] bg-panel-2/80 p-3.5 ring-1 ring-border backdrop-blur-md active:ring-run/40"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] tracking-widest text-faint">
                {pump.name}
              </span>
              <span
                className={
                  pump.running
                    ? "lamp-run size-2 rounded-full bg-run"
                    : "size-2 rounded-full bg-off/80"
                }
              />
            </div>
            <div className="mt-3 flex items-end justify-between gap-2">
              <div
                className={`font-mono text-[30px] leading-none font-semibold ${
                  pump.running ? "text-foreground" : "text-faint"
                }`}
              >
                {String(Math.round(pump.speed)).padStart(3, "0")}
              </div>
              <div className="text-right text-[10px] leading-tight text-muted-foreground">
                mL/min estim.
                <br />
                {pump.running ? (
                  pump.direction === "forward" ? (
                    <span className="text-run">▲ Direto</span>
                  ) : (
                    <span className="text-flow">◄ Reverso</span>
                  )
                ) : (
                  <span className="text-faint">— Parada</span>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="shrink-0 text-[10px] tracking-[0.15em] text-faint uppercase">
                PWM
              </span>
              <div className="h-1 flex-1 rounded-full bg-input">
                <div
                  className={`h-full rounded-full ${
                    pump.running
                      ? pump.direction === "reverse"
                        ? "bg-flow"
                        : "bg-run"
                      : "bg-off/70"
                  }`}
                  style={{ width: `${pump.pwm}%` }}
                />
              </div>
              <span
                className={`shrink-0 font-mono text-[11px] ${
                  pump.running ? "text-muted-foreground" : "text-faint"
                }`}
              >
                {pump.pwm.toFixed(1)}%
              </span>
            </div>
            <div className="mt-3 grid h-8 place-items-center rounded-[10px] bg-foreground/5 ring-1 ring-border">
              <span className="font-mono text-[12px] text-foreground">
                Abrir ›
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
