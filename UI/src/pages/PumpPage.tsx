import { Link, useParams } from "@tanstack/react-router";
import { ConnectBar } from "../components/ConnectBar";
import { StatusStrip } from "../components/StatusStrip";
import { useBench } from "../context/BenchContext";
import {
  maxFlowFromCalibration,
  type PumpDirection,
} from "../lib/calibration";

export function PumpPage() {
  const { id } = useParams({ from: "/bomba/$id" });
  const {
    connected,
    pumps,
    setPwm,
    setFlow,
    setDirection,
    toggleRunning,
    setCalibration,
  } = useBench();
  const pump = pumps.find((item) => item.id === Number(id));
  const maxFlow = pump ? maxFlowFromCalibration(pump.calibration) : 0;

  if (!pump) {
    return (
      <div className="grid min-h-[100dvh] place-items-center px-6 text-center">
        <div>
          <p className="font-mono text-[11px] tracking-widest text-faint">
            UNIDADE INEXISTENTE
          </p>
          <h1 className="mt-2 text-[20px] font-semibold">
            Bomba não encontrada
          </h1>
          <Link
            to="/"
            className="mt-5 inline-block rounded-[12px] bg-foreground/5 px-4 py-2.5 text-[13px] ring-1 ring-border"
          >
            Voltar ao painel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-3xl flex-col">
      <StatusStrip />
      <ConnectBar />
      <div className="px-5 pt-3 pb-1">
        <Link
          to="/"
          className="font-mono text-[11px] tracking-widest text-muted-foreground"
        >
          ‹ PAINEL
        </Link>
      </div>
      <section className="mt-3 flex-1 rounded-t-[22px] bg-panel/90 px-5 pt-3 pb-8 ring-1 ring-border backdrop-blur-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-foreground/20" />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[11px] tracking-widest text-faint">
              UNIDADE {pump.name}
            </p>
            <h1 className="mt-0.5 truncate text-[20px] leading-none font-semibold">
              Bomba de Fluxo
            </h1>
          </div>
          <span
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 ${
              pump.running
                ? "bg-run/10 ring-run/30"
                : "bg-off/10 ring-off/30"
            }`}
          >
            <span
              className={
                pump.running
                  ? "lamp-run size-1.5 rounded-full bg-run"
                  : "size-1.5 rounded-full bg-off"
              }
            />
            <span
              className={`text-[11px] font-medium ${
                pump.running ? "text-run" : "text-off"
              }`}
            >
              {pump.running ? "Ativa" : "Desativada"}
            </span>
          </span>
        </div>

        <div className="mt-6">
          <div className="mb-1 flex items-end justify-between">
            <span className="text-[11px] tracking-[0.15em] text-muted-foreground uppercase">
              Velocidade estimada
            </span>
            <span className="font-mono text-[15px] text-foreground">
              {pump.speed.toFixed(1)}{" "}
              <span className="text-[10px] text-muted-foreground">mL/min</span>
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(1, maxFlow)}
            step={0.5}
            value={Math.min(maxFlow, pump.speed)}
            disabled={!connected}
            aria-label="Velocidade estimada da bomba"
            onChange={(event) => setFlow(pump.id, Number(event.target.value))}
            className="slider-run"
          />
        </div>

        <div className="mt-4">
          <div className="mb-1 flex items-end justify-between">
            <span className="text-[11px] tracking-[0.15em] text-muted-foreground uppercase">
              PWM
            </span>
            <span className="font-mono text-[15px] text-foreground">
              {pump.pwm.toFixed(1)}{" "}
              <span className="text-[10px] text-muted-foreground">%</span>
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={pump.pwm}
            disabled={!connected}
            aria-label="PWM da bomba"
            onChange={(event) => setPwm(pump.id, Number(event.target.value))}
            className="slider-run slider-flow"
          />
        </div>

        <div className="mt-6">
          <span className="text-[11px] tracking-[0.15em] text-muted-foreground uppercase">
            Sentido de rotação
          </span>
          <div className="mt-2 flex rounded-[12px] bg-foreground/5 p-1 ring-1 ring-border">
            {(["forward", "reverse"] as PumpDirection[]).map((direction) => {
              const selected = pump.direction === direction;
              return (
                <button
                  key={direction}
                  disabled={!connected}
                  onClick={() => setDirection(pump.id, direction)}
                  className={`flex-1 rounded-[9px] py-2 text-[12px] leading-none font-medium disabled:opacity-40 ${
                    selected
                      ? "bg-run/15 text-run ring-1 ring-run/30"
                      : "text-muted-foreground"
                  }`}
                >
                  {direction === "forward" ? "Direto" : "Reverso"}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={() => toggleRunning(pump.id)}
          disabled={!connected}
          className={`mt-6 w-full rounded-[14px] py-3.5 text-[13px] leading-none font-semibold ring-1 disabled:opacity-40 ${
            pump.running
              ? "bg-run/90 text-run-foreground ring-run"
              : "bg-foreground/5 text-foreground ring-border"
          }`}
        >
          {pump.running ? "Desligar bomba" : "Ligar bomba"}
        </button>

        <div className="mt-8 rounded-[14px] bg-foreground/4 p-4 ring-1 ring-border">
          <p className="text-[11px] tracking-[0.15em] text-muted-foreground uppercase">
            Calibração com zona morta
          </p>
          <p className="mt-2 font-mono text-[12px] leading-relaxed text-faint">
            Q = 0 se PWM &lt; PWM₀
            <br />
            Q = a × (PWM − PWM₀) se PWM ≥ PWM₀
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-[11px] text-muted-foreground">
              PWM₀ (%)
              <input
                className="field-light mt-1"
                type="number"
                min={0}
                max={99.9}
                step="0.1"
                value={pump.calibration.pwm0}
                onChange={(event) =>
                  setCalibration(pump.id, {
                    ...pump.calibration,
                    pwm0: Number(event.target.value),
                  })
                }
              />
            </label>
            <label className="text-[11px] text-muted-foreground">
              a (mL/min / %)
              <input
                className="field-light mt-1"
                type="number"
                min={0}
                step="0.01"
                value={pump.calibration.a}
                onChange={(event) =>
                  setCalibration(pump.id, {
                    ...pump.calibration,
                    a: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>
          <p className="mt-3 text-[12px] text-muted-foreground">
            PWM₀ é o limiar em que a bomba começa a mover. Acima disso, a vazão
            estimada sobe em reta. Sem sensor, meça o volume em alguns PWM acima
            do limiar para achar a. Em 100% ≈{" "}
            {maxFlow.toFixed(1)} mL/min.
          </p>
        </div>
      </section>
    </div>
  );
}
