import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const statsDir = path.join(root, "data", "stats");
const outputDir = path.join(root, "frontend", "public", "static-data");
const statisticsDir = path.join(outputDir, "statistics");

function parseCsv(text) {
  const [header, ...lines] = text.trim().split(/\r?\n/);
  const keys = header.split(",");
  return lines.filter(Boolean).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(
      keys.map((key, index) => [key, values[index] ?? ""]),
    );
  });
}

const number = (value, name) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed))
    throw new Error(`Invalid number for ${name}: ${value}`);
  return parsed;
};

const landcoverRows = parseCsv(
  await fs.readFile(path.join(statsDir, "landcover_areas_ha.csv"), "utf8"),
);
const changeRows = parseCsv(
  await fs.readFile(path.join(statsDir, "change_areas_ha.csv"), "utf8"),
);
const transitionRows = parseCsv(
  await fs.readFile(
    path.join(statsDir, "transitions_2019_2025_ha.csv"),
    "utf8",
  ),
);
const accuracyRows = parseCsv(
  await fs.readFile(path.join(statsDir, "accuracy.csv"), "utf8"),
);
const legendRows = parseCsv(
  await fs.readFile(path.join(statsDir, "legend.csv"), "utf8"),
);
const studyArea = JSON.parse(
  await fs.readFile(
    path.join(root, "data", "vector", "chefchaouen_aoi.geojson"),
    "utf8",
  ),
);

const legend = legendRows.map((row) => ({
  layer: row.layer,
  value: number(row.value, "legend.value"),
  class_name: row.class_name,
  hex_color: row.hex_color,
}));
const colorFor = (layer, value) => {
  const match = legend.find(
    (entry) => entry.layer === layer && entry.value === value,
  );
  if (!match) throw new Error(`Missing legend entry for ${layer}:${value}`);
  return match.hex_color;
};
const landcover = landcoverRows.map((row) => ({
  year: number(row.year, "landcover.year"),
  value: number(row.value, "landcover.value"),
  name: row.name,
  area_ha: number(row.area_ha, "landcover.area_ha"),
  hex_color: colorFor("landcover", number(row.value, "landcover.value")),
}));
const changes = changeRows.map((row) => ({
  period: row.period,
  value: number(row.value, "change.value"),
  name: row.name,
  area_ha: number(row.area_ha, "change.area_ha"),
  hex_color: colorFor("change", number(row.value, "change.value")),
}));
const transitions = transitionRows.map((row) => ({
  code: number(row.code, "transition.code"),
  from_class: row.from_class,
  to_class: row.to_class,
  area_ha: number(row.area_ha, "transition.area_ha"),
}));
const accuracy = accuracyRows.map((row) => ({
  year: number(row.year, "accuracy.year"),
  overall_accuracy: number(row.overall_accuracy, "accuracy.overall_accuracy"),
  kappa: number(row.kappa, "accuracy.kappa"),
  n_train: number(row.n_train, "accuracy.n_train"),
  n_test: number(row.n_test, "accuracy.n_test"),
}));

const forest2019 = landcover.find(
  (row) => row.year === 2019 && row.value === 1,
)?.area_ha;
const forest2025 = landcover.find(
  (row) => row.year === 2025 && row.value === 1,
)?.area_ha;
if (forest2019 !== 3426.34 || forest2025 !== 3357.39)
  throw new Error("Official forest reference values do not match");
if (studyArea.features?.[0]?.properties?.area_ha !== 8084.5)
  throw new Error("Official study area does not match");

const summary = {
  study_area: {
    name: studyArea.features[0].properties.name,
    area_ha: studyArea.features[0].properties.area_ha,
  },
  landcover: {
    2019: landcover.filter((row) => row.year === 2019),
    2025: landcover.filter((row) => row.year === 2025),
  },
  changes,
  accuracy,
  net_forest_change_ha: Number((forest2025 - forest2019).toFixed(2)),
};

await fs.mkdir(statisticsDir, { recursive: true });
const writeJson = (file, data) =>
  fs.writeFile(
    path.join(statisticsDir, file),
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  );
await writeJson("summary.json", summary);
await writeJson("transitions.json", transitions);
await writeJson("accuracy.json", accuracy);
await writeJson("legend.json", legend);
await fs.writeFile(
  path.join(outputDir, "study_area.geojson"),
  `${JSON.stringify(studyArea, null, 2)}\n`,
  "utf8",
);
console.log(`Generated static statistics in ${statisticsDir}`);
