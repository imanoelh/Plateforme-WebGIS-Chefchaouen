import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(root, 'frontend/public');
const manifest = JSON.parse(await fs.readFile(path.join(publicRoot, 'static-data/manifest.json'), 'utf8'));
const legendLines = (await fs.readFile(path.join(root, 'data/stats/legend.csv'), 'utf8')).trim().split(/\r?\n/).slice(1);
const legends = new Map();
for (const line of legendLines) {
  const [layer, value, , hex] = line.split(',');
  const rgb = hex.slice(1).match(/../g).map((part) => Number.parseInt(part, 16));
  if (!legends.has(layer)) legends.set(layer, new Map());
  legends.get(layer).set(Number(value), [...rgb, 255]);
}

const reports = [];
for (const [id, raster] of Object.entries(manifest.rasters)) {
  const classes = await fs.readFile(path.join(publicRoot, raster.classData));
  const png = PNG.sync.read(await fs.readFile(path.join(publicRoot, raster.displayImage)));
  const palette = legends.get(id === 'change_2019_2025' ? 'change' : 'landcover');
  palette.set(raster.nodata, [0, 0, 0, 0]);
  if (png.width !== raster.width || png.height !== raster.height) throw new Error(`${id}: dimensions PNG/manifest incohérentes`);
  if (classes.length !== raster.width * raster.height) throw new Error(`${id}: nombre de classes incohérent`);
  const counts = new Map();
  for (let index = 0; index < classes.length; index += 1) {
    const code = classes[index];
    counts.set(code, (counts.get(code) ?? 0) + 1);
    const expected = palette.get(code);
    if (!expected) throw new Error(`${id}: code inattendu ${code} à l’index ${index}`);
    const offset = index * 4;
    for (let channel = 0; channel < 4; channel += 1) {
      if (png.data[offset + channel] !== expected[channel]) throw new Error(`${id}: PNG/BIN incohérent à l’index ${index}`);
    }
  }
  const samples = [[0, 0], [raster.width - 1, 0], [raster.width - 1, raster.height - 1], [0, raster.height - 1], [Math.floor(raster.width / 2), Math.floor(raster.height / 2)]];
  reports.push({ id, dimensions: `${png.width}x${png.height}`, classBytes: classes.length, classCounts: Object.fromEntries([...counts.entries()].sort(([a], [b]) => a - b)), samples: samples.map(([x, y]) => ({ x, y, class: classes[y * raster.width + x] })) });
}

const entries = Object.entries(manifest.rasters);
const first = entries[0]?.[1];
const sameGrid = entries.every(([, raster]) => JSON.stringify({ width: raster.width, height: raster.height, sourceCrs: raster.sourceCrs, origin: raster.origin, resolution: raster.resolution, bbox: raster.bbox }) === JSON.stringify({ width: first.width, height: first.height, sourceCrs: first.sourceCrs, origin: first.origin, resolution: first.resolution, bbox: first.bbox }));
console.log(JSON.stringify({ sameGrid, reports }, null, 2));
