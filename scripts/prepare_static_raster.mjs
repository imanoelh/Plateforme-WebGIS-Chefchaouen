import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { fromFile } from 'geotiff';
import { PNG } from 'pngjs';
import proj4 from 'proj4';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const legendPath = path.join(projectRoot, 'data/stats/legend.csv');
const outputDir = path.join(projectRoot, 'frontend/public/static-data');
const rasterDefinitions = [
  { id: 'landcover_2019', source: 'data/rasters/chefchaouen_landcover_2019.tif', layer: 'landcover', image: 'rasters/landcover_2019.png', classes: 'rasters/landcover_2019.classes.bin' },
  { id: 'landcover_2025', source: 'data/rasters/chefchaouen_landcover_2025.tif', layer: 'landcover', image: 'rasters/landcover_2025.png', classes: 'rasters/landcover_2025.classes.bin' },
  { id: 'change_2019_2025', source: 'data/rasters/chefchaouen_change_2019_2025.tif', layer: 'change', image: 'rasters/change_2019_2025.png', classes: 'rasters/change_2019_2025.classes.bin' },
];

function parseLegend(csv) {
  const lines = csv.trim().split(/\r?\n/);
  const header = lines.shift().split(',');
  return lines.map((line) => {
    const values = line.split(',');
    return Object.fromEntries(header.map((key, index) => [key, values[index]]));
  });
}

function hexToRgba(hex) {
  const value = hex.replace('#', '');
  return [Number.parseInt(value.slice(0, 2), 16), Number.parseInt(value.slice(2, 4), 16), Number.parseInt(value.slice(4, 6), 16), 255];
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function transformCorner(crs, x, y) {
  return proj4(crs, 'EPSG:4326', [x, y]);
}

const allLegend = parseLegend(await fs.readFile(legendPath, 'utf8'));
await fs.mkdir(path.join(outputDir, 'rasters'), { recursive: true });
const manifestRasters = {};
const audit = [];

for (const definition of rasterDefinitions) {
  const sourcePath = path.join(projectRoot, definition.source);
  const sourceBuffer = await fs.readFile(sourcePath);
  const tiff = await fromFile(sourcePath);
  const image = await tiff.getImage();
  const width = image.getWidth();
  const height = image.getHeight();
  const origin = image.getOrigin();
  const resolution = image.getResolution();
  const bbox = image.getBoundingBox();
  const nodata = Number(image.getGDALNoData() ?? 0);
  const geoKeys = image.getGeoKeys();
  const epsg = geoKeys.ProjectedCSTypeGeoKey;
  if (!epsg) throw new Error(`${definition.id}: CRS absent`);
  if (resolution[0] !== 10 || resolution[1] !== -10) throw new Error(`${definition.id}: résolution inattendue ${resolution.join(', ')}`);

  const legend = allLegend.filter((entry) => entry.layer === definition.layer);
  const palette = new Map(legend.map((entry) => [Number(entry.value), hexToRgba(entry.hex_color)]));
  const classes = await image.readRasters({ interleave: true });
  const counts = new Map();
  const png = new PNG({ width, height });
  for (let index = 0; index < classes.length; index += 1) {
    const code = Number(classes[index]);
    counts.set(code, (counts.get(code) ?? 0) + 1);
    const rgba = code === nodata ? [0, 0, 0, 0] : palette.get(code);
    if (!rgba) throw new Error(`${definition.id}: code de classe inattendu ${code}`);
    const offset = index * 4;
    png.data[offset] = rgba[0];
    png.data[offset + 1] = rgba[1];
    png.data[offset + 2] = rgba[2];
    png.data[offset + 3] = rgba[3];
  }

  const classBuffer = Buffer.from(classes);
  const imagePath = path.join(outputDir, definition.image);
  const classesPath = path.join(outputDir, definition.classes);
  await fs.writeFile(classesPath, classBuffer);
  await fs.writeFile(imagePath, PNG.sync.write(png));
  const [minX, minY, maxX, maxY] = bbox;
  const displayCoordinates = [transformCorner(`EPSG:${epsg}`, minX, maxY), transformCorner(`EPSG:${epsg}`, maxX, maxY), transformCorner(`EPSG:${epsg}`, maxX, minY), transformCorner(`EPSG:${epsg}`, minX, minY)];
  const entry = {
    displayImage: `static-data/${definition.image}`,
    classData: `static-data/${definition.classes}`,
    width, height, sourceCrs: `EPSG:${epsg}`, displayCrs: 'EPSG:4326', origin, resolution, bbox, displayCoordinates, nodata,
    classes: Object.fromEntries(legend.map((item) => [item.value, { name: item.class_name, color: item.hex_color }])),
    classCodes: [...counts.keys()].sort((a, b) => a - b),
    classCounts: Object.fromEntries([...counts.entries()].sort(([a], [b]) => a - b)),
    sourceSha256: sha256(sourceBuffer),
    classDataOrder: 'row-major, top-to-bottom, left-to-right',
    mapLibreCoordinatesOrder: 'top-left, top-right, bottom-right, bottom-left',
  };
  manifestRasters[definition.id] = entry;
  audit.push({ id: definition.id, geoKeys, ...entry, pngBytes: (await fs.stat(imagePath)).size, classBytes: classBuffer.length });
}

await fs.writeFile(path.join(outputDir, 'manifest.json'), `${JSON.stringify({ version: 1, rasters: manifestRasters }, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(audit, null, 2));
