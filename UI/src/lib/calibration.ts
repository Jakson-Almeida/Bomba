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
  pwm0: number;
};

export const DEFAULT_CALIBRATION: Calibration = { a: 3, pwm0: 70 };

export function clampPwm(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, value));
}

export function clampPwm0(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_CALIBRATION.pwm0;
  }
  return Math.min(99.9, Math.max(0, value));
}

export function sanitizeCalibration(value: Partial<Calibration> | null | undefined): Calibration {
  const rawA = value?.a;
  const a = Number.isFinite(rawA) ? Math.max(0, rawA as number) : DEFAULT_CALIBRATION.a;
  return {
    a,
    pwm0: clampPwm0(value?.pwm0 ?? DEFAULT_CALIBRATION.pwm0),
  };
}

export function flowFromPwm(pwm: number, calibration: Calibration) {
  const { a, pwm0 } = sanitizeCalibration(calibration);
  const duty = clampPwm(pwm);
  if (duty < pwm0 || a <= 0) {
    return 0;
  }
  return a * (duty - pwm0);
}

export function maxFlowFromCalibration(calibration: Calibration) {
  const { a, pwm0 } = sanitizeCalibration(calibration);
  return Math.max(0, a * (100 - pwm0));
}

export function pwmFromFlow(flow: number, calibration: Calibration) {
  const { a, pwm0 } = sanitizeCalibration(calibration);
  if (!Number.isFinite(flow) || flow <= 0 || a <= 0) {
    return 0;
  }
  return clampPwm(pwm0 + flow / a);
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
