import {
  MOTOR_COUNT,
  createDefaultCalibrations,
  type Calibration,
} from "./calibration";

const STORAGE_KEY = "bomba.calibration.v1";

export function loadCalibrations(): Calibration[] {
  const fallback = createDefaultCalibrations();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw) as Calibration[];
    if (!Array.isArray(parsed) || parsed.length !== MOTOR_COUNT) {
      return fallback;
    }
    return parsed.map((item, index) => ({
      a: Number.isFinite(item?.a) ? item.a : fallback[index].a,
      b: Number.isFinite(item?.b) ? item.b : fallback[index].b,
    }));
  } catch {
    return fallback;
  }
}

export function saveCalibrations(calibrations: Calibration[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(calibrations));
}
