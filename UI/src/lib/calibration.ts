export const MOTOR_COUNT = 6;
export const BAUD_RATE = 115200;
export const PWM_BITS = 12;
export const PWM_MAX = (1 << PWM_BITS) - 1;

export type PumpDirection = "forward" | "reverse";

export type PumpSetpoint = {
  enabled: boolean;
  direction: PumpDirection;
  pwm: number;
};

export type Calibration = {
  a: number;
  b: number;
};

export const DEFAULT_CALIBRATION: Calibration = { a: 3, b: 0 };

export function clampPwm(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

export function flowFromPwm(pwm: number, calibration: Calibration) {
  return calibration.a * pwm + calibration.b;
}

export function pwmFromFlow(flow: number, calibration: Calibration) {
  if (Math.abs(calibration.a) < 1e-9) {
    return 0;
  }
  return clampPwm((flow - calibration.b) / calibration.a);
}

export function pumpName(id: number) {
  return `P${String(id).padStart(2, "0")}`;
}

export function createDefaultSetpoints(): PumpSetpoint[] {
  return Array.from({ length: MOTOR_COUNT }, () => ({
    enabled: false,
    direction: "forward" as const,
    pwm: 0,
  }));
}

export function createDefaultCalibrations(): Calibration[] {
  return Array.from({ length: MOTOR_COUNT }, () => ({
    ...DEFAULT_CALIBRATION,
  }));
}

export function formatFlow(value: number) {
  return String(Math.max(0, Math.round(value))).padStart(3, "0");
}

export function formatPwm(value: number) {
  return value.toFixed(1).padStart(5, "0");
}
