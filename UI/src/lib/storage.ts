import {
  MOTOR_COUNT,
  createDefaultCalibrations,
  sanitizeCalibration,
  type Calibration,
} from "./calibration";

const STORAGE_KEY = "bomba.calibration.v2";

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
    return parsed.map((item, index) =>
      sanitizeCalibration(item ?? fallback[index]),
    );
  } catch {
    return fallback;
  }
}

export function saveCalibrations(calibrations: Calibration[]) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(calibrations.map((item) => sanitizeCalibration(item))),
  );
}
