// Provided project statistics (ha). Replace with API_URL responses later — do not alter values.
export const KPIS = {
  studyArea: 8084.5,
  forest2019: 3426.34,
  forest2025: 3357.39,
  netForestChange: -68.95,
};

export const LAND_COVER_STATS = [
  { name: "Forest", y2019: 3426.34, y2025: 3357.39 },
  { name: "Shrubland / Grassland", y2019: 3663.12, y2025: 3750.8 },
  { name: "Cropland", y2019: 541.19, y2025: 487.94 },
  { name: "Built-up", y2019: 241.99, y2025: 251.95 },
  { name: "Bare / Sparse", y2019: 211.69, y2025: 236.35 },
  { name: "Water", y2019: 0.15, y2025: 0.04 },
];

export const CHANGE_STATS = [
  { name: "Stable", value: 7245.14 },
  { name: "Forest Loss", value: 261.13 },
  { name: "Forest Gain", value: 192.19 },
  { name: "Other Change", value: 386.02 },
];

export interface Transition {
  from: string;
  to: string;
  area: number;
}
// Populated later from transitions_2019_2025_ha.csv. Intentionally empty.
export const TRANSITIONS: Transition[] = [];

export const fmtHa = (n: number, digits = 2) =>
  n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
