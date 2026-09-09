import {
  MOTOR_COUNT,
  clampPwm,
  type PumpDirection,
  type PumpSetpoint,
} from "./calibration";

export type ParsedHello = {
  kind: "hello";
  motors: number;
  bits: number;
};

export type ParsedState = {
  kind: "state";
  pumps: PumpSetpoint[];
};

export type ParsedError = {
  kind: "error";
  message: string;
};

export type ParsedLine = ParsedHello | ParsedState | ParsedError;

export function parseLine(raw: string): ParsedLine | null {
  const line = raw.trim();
  if (!line) {
    return null;
  }

  const parts = line.split(",");
  const tag = parts[0];

  if (tag === "H") {
    return {
      kind: "hello",
      motors: Number(parts[2] || MOTOR_COUNT),
      bits: Number(parts[3] || 12),
    };
  }

  if (tag === "ERR") {
    return { kind: "error", message: parts.slice(1).join(",") || "erro" };
  }

  if (tag === "S") {
    const pumps = createEmptyState();
    for (let i = 1; i + 3 < parts.length; i += 4) {
      const id = Number(parts[i]);
      if (id < 1 || id > MOTOR_COUNT) {
        continue;
      }
      pumps[id - 1] = {
        enabled: parts[i + 1] === "1",
        direction: parts[i + 2] === "R" ? "reverse" : "forward",
        pwm: clampPwm(Number(parts[i + 3])),
      };
    }
    return { kind: "state", pumps };
  }

  return null;
}

export function createEmptyState(): PumpSetpoint[] {
  return Array.from({ length: MOTOR_COUNT }, () => ({
    enabled: false,
    direction: "forward" as const,
    pwm: 0,
  }));
}

export const commands = {
  hello: () => "H",
  get: () => "G",
  stopAll: () => "X",
  pwm: (id: number, percent: number) => `P,${id},${clampPwm(percent).toFixed(2)}`,
  direction: (id: number, direction: PumpDirection) =>
    `D,${id},${direction === "forward" ? "F" : "R"}`,
  enable: (id: number, enabled: boolean) => `E,${id},${enabled ? 1 : 0}`,
};
