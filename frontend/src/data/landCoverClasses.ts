export interface LegendClass { value: number; name: string; color: string }

export const LAND_COVER_CLASSES: LegendClass[] = [
  { value: 1, name: "Forest", color: "#1B7837" },
  { value: 2, name: "Shrubland / Grassland", color: "#A6D96A" },
  { value: 3, name: "Cropland", color: "#FEE08B" },
  { value: 4, name: "Built-up", color: "#D73027" },
  { value: 5, name: "Bare / Sparse", color: "#BDBDBD" },
  { value: 6, name: "Water", color: "#4575B4" },
];
