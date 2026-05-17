/**
 * Consolida fuentes KML / GeoJSON / CSV de public/data/geo/ en tandil-pois.json.
 * Ejecutar: node scripts/process-geo.js
 */
const fs = require('fs');
const path = require('path');
const { DOMParser } = require('@xmldom/xmldom');
const { kml } = require('@tmcw/togeojson');
const csv = require('csv-parser');
const proj4 = require('proj4');
const wellknown = require('wellknown');

proj4.defs(
  'EPSG:22185',
  '+proj=tmerc +lat_0=-90 +lon_0=-60 +k=1 +x_0=5500000 +y_0=0 +ellps=WGS84 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
);

const ROOT = path.join(__dirname, '..');
const GEO_DIR = path.join(ROOT, 'public/data/geo');
const OUT_FILE = path.join(ROOT, 'public/data/tandil-pois.json');

const BUS_COLOR_HEX = {
  amarillo: '#F5C518',
  rojo: '#E53935',
  azul: '#2563EB',
  verde: '#1C5E3C',
  blanco: '#6B7280',
  'marron a': '#8D6E63',
  'marron b': '#6D4C41',
  marron: '#8D6E63',
};

const pois = {
  educacion: [],
  salud: [],
  parques: [],
  seguridad: [],
  supermercados: [],
  transporte: [],
};

const seenKeys = new Set();

function isValidCoord(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * POSGAR 94 Faja 5 (EPSG:22185).
 * El WKT del CSV trae pares northing/easting (Y, X); proj4 espera [easting, northing].
 */
function posgarFaja5ToLatLng(northing, easting) {
  const [lng, lat] = proj4('EPSG:22185', 'EPSG:4326', [easting, northing]);
  if (!isValidCoord(lat, lng)) return null;
  return [lat, lng];
}

function colorNameToHex(colorName) {
  const raw = String(colorName ?? '').trim();
  if (/^#[0-9a-f]{3,8}$/i.test(raw)) return raw;
  const key = raw.toLowerCase();
  return BUS_COLOR_HEX[key] ?? '#1C5E3C';
}

function pushTransportRoute(route) {
  const linea = String(route.linea ?? '').trim();
  const colorRaw = String(route.color ?? '').trim();
  const nombre = linea ? `Línea ${linea}` : 'Recorrido colectivo';
  const id = linea
    ? `linea-${linea}${colorRaw ? `-${colorRaw.replace(/\s+/g, '-')}` : ''}`
    : `linea-${nombre.replace(/\s+/g, '-')}`;
  const key = `transporte|${id}`;
  if (seenKeys.has(key)) return;
  seenKeys.add(key);

  const paths = route.paths;
  const first = paths[0]?.[0];
  pois.transporte.push({
    categoria: 'transporte',
    id,
    nombre,
    color: colorNameToHex(colorRaw),
    paths,
    linea: linea || undefined,
    ...(first ? { lat: first[0], lng: first[1] } : {}),
    ...(route.extraData ? { extraData: route.extraData } : {}),
  });
}

function pushPoi(category, poi) {
  const lat = Number(poi.lat);
  const lng = Number(poi.lng);
  if (!isValidCoord(lat, lng)) return;
  const nombre = String(poi.nombre ?? '').trim() || 'Sin nombre';
  const key = `${category}|${nombre}|${lat.toFixed(5)}|${lng.toFixed(5)}`;
  if (seenKeys.has(key)) return;
  seenKeys.add(key);
  pois[category].push({
    nombre,
    lat,
    lng,
    ...(poi.extraData !== undefined ? { extraData: poi.extraData } : {}),
  });
}

function coordsFromPosition(pos) {
  if (!Array.isArray(pos) || pos.length < 2) return null;
  const lng = Number(pos[0]);
  const lat = Number(pos[1]);
  if (!isValidCoord(lat, lng)) return null;
  return { lat, lng };
}

function ringCentroid(ring) {
  if (!Array.isArray(ring) || ring.length === 0) return null;
  let sumLat = 0;
  let sumLng = 0;
  let n = 0;
  for (const pos of ring) {
    const c = coordsFromPosition(pos);
    if (!c) continue;
    sumLat += c.lat;
    sumLng += c.lng;
    n++;
  }
  if (n === 0) return null;
  return { lat: sumLat / n, lng: sumLng / n };
}

function parseKmlCoordinatesText(text) {
  const points = [];
  const tokens = String(text)
    .trim()
    .split(/[\s\n]+/)
    .filter(Boolean);
  for (const token of tokens) {
    const parts = token.split(',').map((p) => Number(p.trim()));
    if (parts.length < 2) continue;
    const lng = parts[0];
    const lat = parts[1];
    if (isValidCoord(lat, lng)) points.push({ lat, lng });
  }
  return points;
}

function centroidFromLatLngPoints(points) {
  if (!points.length) return null;
  let sumLat = 0;
  let sumLng = 0;
  for (const p of points) {
    sumLat += p.lat;
    sumLng += p.lng;
  }
  return { lat: sumLat / points.length, lng: sumLng / points.length };
}

function getElementsByLocalName(node, localName) {
  const found = [];
  const walk = (el) => {
    if (!el) return;
    if (el.localName === localName || el.nodeName === localName) found.push(el);
    for (let i = 0; i < el.childNodes.length; i++) walk(el.childNodes[i]);
  };
  walk(node);
  return found;
}

function placemarkName(placemark) {
  for (const localName of ['name', 'E_Verde']) {
    for (const el of getElementsByLocalName(placemark, localName)) {
      const text = (el.textContent || '').trim();
      if (text) return text;
    }
  }
  return 'POI';
}

/** Parseo directo KML: Point y Polygon (centroide del LinearRing exterior). */
function ingestKmlNative(filePath, category) {
  const xml = fs.readFileSync(filePath, 'utf8');
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  const placemarks = getElementsByLocalName(doc, 'Placemark');
  let count = 0;

  for (const placemark of placemarks) {
    const nombre = placemarkName(placemark);

    for (const point of getElementsByLocalName(placemark, 'Point')) {
      const coordEl = getElementsByLocalName(point, 'coordinates')[0];
      if (!coordEl) continue;
      const parsed = parseKmlCoordinatesText(coordEl.textContent);
      if (parsed[0]) {
        pushPoi(category, { nombre, lat: parsed[0].lat, lng: parsed[0].lng });
        count++;
      }
    }

    for (const polygon of getElementsByLocalName(placemark, 'Polygon')) {
      const outerBlocks = getElementsByLocalName(polygon, 'outerBoundaryIs');
      const rings =
        outerBlocks.length > 0
          ? outerBlocks.flatMap((b) => getElementsByLocalName(b, 'LinearRing'))
          : getElementsByLocalName(polygon, 'LinearRing');

      for (const ring of rings) {
        const coordEl = getElementsByLocalName(ring, 'coordinates')[0];
        if (!coordEl) continue;
        const c = centroidFromLatLngPoints(parseKmlCoordinatesText(coordEl.textContent));
        if (c) {
          pushPoi(category, { nombre, lat: c.lat, lng: c.lng });
          count++;
        }
      }
    }
  }

  console.log(`[${path.basename(filePath)} native] ${count} POIs → ${category}`);
}

function geometryToPois(geom, props, fallbackName) {
  const out = [];
  if (!geom) return out;

  const baseName = featureName(props, fallbackName);

  if (geom.type === 'GeometryCollection' && Array.isArray(geom.geometries)) {
    for (const g of geom.geometries) {
      out.push(...geometryToPois(g, props, baseName));
    }
    return out;
  }

  if (geom.type === 'Point') {
    const c = coordsFromPosition(geom.coordinates);
    if (c) out.push({ ...c, nombre: baseName });
    return out;
  }

  if (geom.type === 'MultiPoint') {
    geom.coordinates.forEach((pos, i) => {
      const c = coordsFromPosition(pos);
      if (c) out.push({ ...c, nombre: `${baseName} (${i + 1})` });
    });
    return out;
  }

  if (geom.type === 'Polygon') {
    for (const ring of geom.coordinates) {
      const c = ringCentroid(ring);
      if (c) out.push({ ...c, nombre: baseName });
    }
    return out;
  }

  if (geom.type === 'MultiPolygon') {
    for (const poly of geom.coordinates) {
      for (const ring of poly) {
        const c = ringCentroid(ring);
        if (c) out.push({ ...c, nombre: baseName });
      }
    }
    return out;
  }

  if (geom.type === 'LineString') {
    const c = ringCentroid(geom.coordinates);
    if (c) out.push({ ...c, nombre: baseName });
    return out;
  }

  if (geom.type === 'MultiLineString') {
    for (const line of geom.coordinates) {
      const c = ringCentroid(line);
      if (c) out.push({ ...c, nombre: baseName });
    }
    return out;
  }

  return out;
}

function featureName(props, fallback) {
  const p = props ?? {};
  return p.name || p.Name || p.institucion || p.nombre || p.E_Verde || fallback;
}

function readKmlFile(filePath) {
  const xml = fs.readFileSync(filePath, 'utf8');
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  return kml(doc);
}

function ingestGeoJson(geojson, category, label) {
  if (!geojson?.features?.length) {
    console.warn(`[${label}] Sin features.`);
    return;
  }
  let count = 0;
  for (const f of geojson.features) {
    const list = geometryToPois(f.geometry, f.properties, 'POI');
    for (const p of list) {
      pushPoi(category, {
        nombre: p.nombre,
        lat: p.lat,
        lng: p.lng,
        extraData: f.properties ?? undefined,
      });
      count++;
    }
  }
  console.log(`[${label}] ${count} POIs → ${category}`);
}

function processKml(filename, category) {
  const filePath = path.join(GEO_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`[${filename}] No encontrado, se omite.`);
    return;
  }
  try {
    const geojson = readKmlFile(filePath);
    ingestGeoJson(geojson, category, filename);
    ingestKmlNative(filePath, category);
  } catch (err) {
    console.error(`[${filename}] Error:`, err.message);
  }
}

function processGeoJsonFile(filename, category) {
  const filePath = path.join(GEO_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`[${filename}] No encontrado, se omite.`);
    return;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const geojson = JSON.parse(raw);
    ingestGeoJson(geojson, category, filename);
  } catch (err) {
    console.error(`[${filename}] Error:`, err.message);
  }
}

/** POIs de educación generados por scripts/geocode-education.js */
function processEducacionGeocoded() {
  const filePath = path.join(GEO_DIR, 'educacion-geocoded.json');
  if (!fs.existsSync(filePath)) {
    console.warn('[educacion-geocoded.json] No encontrado. Ejecutá: npm run geo:geocode');
    return;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) {
      throw new Error('Se esperaba un array JSON');
    }

    let count = 0;
    for (const item of items) {
      const lat = Number(item.lat);
      const lng = Number(item.lng);
      const nombre = String(item.nombre ?? '').trim();
      if (!nombre || !isValidCoord(lat, lng)) continue;

      pushPoi('educacion', {
        nombre,
        lat,
        lng,
        ...(item.extraData !== undefined ? { extraData: item.extraData } : {}),
      });
      count++;
    }

    console.log(`[educacion-geocoded.json] ${count} POIs → educacion`);
  } catch (err) {
    console.error('[educacion-geocoded.json] Error:', err.message);
  }
}

/** WKT (EPSG:22185) → segmentos Leaflet [lat, lng][]. */
function wktToPathSegments(wktString) {
  const geom = wellknown.parse(String(wktString).trim());
  if (!geom) return [];

  const segments = [];

  const lineToSegment = (coords) => {
    const segment = [];
    for (const pair of coords) {
      if (!Array.isArray(pair) || pair.length < 2) continue;
      const northing = Number(pair[0]);
      const easting = Number(pair[1]);
      const latLng = posgarFaja5ToLatLng(northing, easting);
      if (latLng) segment.push(latLng);
    }
    if (segment.length >= 2) segments.push(segment);
  };

  if (geom.type === 'LineString') {
    lineToSegment(geom.coordinates);
  } else if (geom.type === 'MultiLineString') {
    for (const line of geom.coordinates) {
      lineToSegment(line);
    }
  }

  return segments;
}

function processBusCsv() {
  const filePath = path.join(GEO_DIR, 'recorridos_colectivos_tandil.csv');
  if (!fs.existsSync(filePath)) {
    console.warn('[recorridos_colectivos_tandil.csv] No encontrado, se omite.');
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('error', (err) => {
        console.error('[recorridos_colectivos_tandil.csv] Error:', err.message);
        resolve();
      })
      .on('end', () => {
        let count = 0;
        for (const row of rows) {
          try {
            const geom = row.geom ?? row.GEOM ?? '';
            const linea = row.linea ?? row.Linea ?? row.LINEA ?? '';
            const color = row.color ?? row.Color ?? '';
            const paths = wktToPathSegments(geom);
            if (paths.length === 0) continue;

            pushTransportRoute({
              linea,
              color,
              paths,
              extraData: { linea, color, fid: row.FID },
            });
            count++;
          } catch (err) {
            console.warn('[recorridos_colectivos_tandil.csv] Fila omitida:', err.message);
          }
        }
        console.log(`[recorridos_colectivos_tandil.csv] ${count} rutas → transporte`);
        resolve();
      });
  });
}

async function main() {
  console.log('Procesando fuentes geográficas de Tandil…\n');

  processEducacionGeocoded();
  processKml('gobierno-abierto-tandil-centros-de-salud.kml', 'salud');
  processKml('hospitales_tandil.kml', 'salud');
  processKml('gobierno-abierto-tandil-espacios-verdes.kml', 'parques');
  processKml('gobierno-abierto-tandil-comisarias.kml', 'seguridad');

  processGeoJsonFile('supermercados.geojson', 'supermercados');

  await processBusCsv();

  const summary = Object.fromEntries(
    Object.entries(pois).map(([k, v]) => [k, v.length])
  );
  const total = Object.values(summary).reduce((a, b) => a + b, 0);

  fs.writeFileSync(OUT_FILE, JSON.stringify(pois), 'utf8');

  console.log('\nResumen:', summary);
  console.log(`Total: ${total} POIs`);
  console.log(`\n✓ Escrito: ${OUT_FILE}`);
}

main().catch((err) => {
  console.error('Falló el proceso:', err);
  process.exit(1);
});
