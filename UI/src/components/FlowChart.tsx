import {
  windowSeconds,
  type ChartSeriesId,
  type ChartTimeMode,
  type PumpChartConfig,
} from "../lib/calibration";

export type TelemetrySample = {
  t: number;
  flow: number;
  volume: number;
};

const WIDTH = 640;
const HEIGHT = 220;
const PAD = { top: 18, right: 48, bottom: 28, left: 48 };

function niceMax(value: number) {
  if (value <= 0) {
    return 1;
  }
  const exp = 10 ** Math.floor(Math.log10(value));
  const scaled = value / exp;
  const nice = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return nice * exp;
}

function toPath(points: { x: number; y: number }[]) {
  if (points.length === 0) {
    return "";
  }
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
}

function formatClock(ts: number) {
  return new Date(ts).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDuration(ms: number) {
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours}h${String(minutes % 60).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function FlowChart({
  samples,
  chart,
  now = Date.now(),
}: {
  samples: TelemetrySample[];
  chart: PumpChartConfig;
  now?: number;
}) {
  const window = windowSeconds(chart.timeMode);
  const tMax = now;
  const tMin = window === null
    ? samples[0]?.t ?? tMax - 1000
    : tMax - window * 1000;
  const span = Math.max(1000, tMax - tMin);
  const visible = samples.filter((sample) => sample.t >= tMin && sample.t <= tMax);
  const series = chart.series;
  const showFlow = series.includes("flow");
  const showVolume = series.includes("volume");
  const flowMax = niceMax(Math.max(...visible.map((sample) => sample.flow), 0));
  const volumeMax = niceMax(Math.max(...visible.map((sample) => sample.volume), 0));
  const innerW = WIDTH - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;

  const mapX = (t: number) => PAD.left + ((t - tMin) / span) * innerW;
  const mapFlow = (value: number) =>
    PAD.top + innerH - (value / flowMax) * innerH;
  const mapVolume = (value: number) =>
    PAD.top + innerH - (value / volumeMax) * innerH;

  const flowPoints = visible.map((sample) => ({
    x: mapX(sample.t),
    y: mapFlow(sample.flow),
  }));
  const volumePoints = visible.map((sample) => ({
    x: mapX(sample.t),
    y: mapVolume(sample.volume),
  }));

  const last = visible[visible.length - 1];
  const ticks = 4;

  return (
    <div className="overflow-hidden rounded-[14px] bg-panel-2 ring-1 ring-border">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-[220px] w-full"
        role="img"
        aria-label="Gráfico de vazão e volume"
      >
        <defs>
          <linearGradient id={`flowFill-${chart.id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(48% 0.12 232)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="oklch(48% 0.12 232)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`volFill-${chart.id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#9b1b30" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#9b1b30" stopOpacity="0" />
          </linearGradient>
        </defs>
        {Array.from({ length: ticks + 1 }, (_, index) => {
          const y = PAD.top + (innerH * index) / ticks;
          return (
            <line
              key={index}
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y}
              y2={y}
              stroke="currentColor"
              className="text-border"
              strokeWidth="1"
            />
          );
        })}
        {showFlow && flowPoints.length > 1 && (
          <>
            <path
              d={`${toPath(flowPoints)} L ${flowPoints[flowPoints.length - 1].x.toFixed(1)} ${PAD.top + innerH} L ${flowPoints[0].x.toFixed(1)} ${PAD.top + innerH} Z`}
              fill={`url(#flowFill-${chart.id})`}
            />
            <path
              d={toPath(flowPoints)}
              fill="none"
              stroke="oklch(48% 0.12 232)"
              strokeWidth="2.4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </>
        )}
        {showVolume && volumePoints.length > 1 && (
          <path
            d={toPath(volumePoints)}
            fill="none"
            stroke="#9b1b30"
            strokeWidth="2.4"
            strokeDasharray={showFlow ? "6 4" : undefined}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {visible.length <= 1 && (
          <text
            x={WIDTH / 2}
            y={HEIGHT / 2}
            textAnchor="middle"
            className="fill-faint"
            fontSize="12"
          >
            Aguardando amostras…
          </text>
        )}
        {showFlow &&
          Array.from({ length: ticks + 1 }, (_, index) => {
            const value = flowMax * (1 - index / ticks);
            const y = PAD.top + (innerH * index) / ticks;
            return (
              <text
                key={`f-${index}`}
                x={PAD.left - 8}
                y={y + 3}
                textAnchor="end"
                fontSize="9"
                className="fill-muted-foreground"
              >
                {value >= 10 ? value.toFixed(0) : value.toFixed(1)}
              </text>
            );
          })}
        {showVolume &&
          Array.from({ length: ticks + 1 }, (_, index) => {
            const value = volumeMax * (1 - index / ticks);
            const y = PAD.top + (innerH * index) / ticks;
            return (
              <text
                key={`v-${index}`}
                x={WIDTH - PAD.right + 8}
                y={y + 3}
                textAnchor="start"
                fontSize="9"
                className="fill-muted-foreground"
              >
                {value >= 10 ? value.toFixed(0) : value.toFixed(1)}
              </text>
            );
          })}
        <text
          x={PAD.left}
          y={HEIGHT - 6}
          fontSize="9"
          className="fill-faint"
        >
          {formatClock(tMin)}
        </text>
        <text
          x={WIDTH - PAD.right}
          y={HEIGHT - 6}
          textAnchor="end"
          fontSize="9"
          className="fill-faint"
        >
          {window === null ? formatDuration(span) : formatClock(tMax)}
        </text>
      </svg>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2">
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          {showFlow && (
            <span className="inline-flex items-center gap-1.5 text-run">
              <span className="h-0.5 w-4 rounded-full bg-run" />
              Vazão {last ? last.flow.toFixed(1) : "0.0"} mL/min
            </span>
          )}
          {showVolume && (
            <span className="inline-flex items-center gap-1.5 text-[#9b1b30]">
              <span className="h-0.5 w-4 rounded-full bg-[#9b1b30]" />
              Volume {last ? last.volume.toFixed(1) : "0.0"} mL
            </span>
          )}
        </div>
        <p className="font-mono text-[10px] text-faint">
          {visible.length} pts
        </p>
      </div>
    </div>
  );
}

export const TIME_MODE_OPTIONS: { id: ChartTimeMode; label: string }[] = [
  { id: "all", label: "Desde o início" },
  { id: "30", label: "30 s" },
  { id: "60", label: "1 min" },
  { id: "300", label: "5 min" },
  { id: "900", label: "15 min" },
];

export const SERIES_OPTIONS: { id: ChartSeriesId; label: string }[] = [
  { id: "flow", label: "Vazão" },
  { id: "volume", label: "Volume acumulado" },
];
