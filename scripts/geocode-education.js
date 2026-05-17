/**
 * Geocodifica establecimientos educativos desde texto plano vía Nominatim.
 * Ejecutar: npm run geo:geocode
 * Luego: npm run geo:process
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GEO_DIR = path.join(ROOT, 'public/data/geo');
const INPUT_FILE = path.join(GEO_DIR, 'datos educacion final.txt');
const OUTPUT_FILE = path.join(GEO_DIR, 'educacion-geocoded.json');

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'TandilUrban-App/1.0 (contacto@tandilurban.com.ar)';
const DELAY_MS = 1200;

const SECTION_HEADER =
  /^(Jardines de|Establecimientos de|Primarias|Secundarias|Educaci[oó]n Especial|Establecimiento\s*-\s*Orientaci)/i;
const INSTITUTION_LINE = /^(E\.E\.[MET]\.|Escuela Nacional)/i;

/** Corrige texto exportado con encoding Windows-1252 / Latin-1 mal interpretado. */
function fixEncoding(text) {
  return (
    text
      // Comillas/apóstrofos rotos → í (Jardín, Martín…)
      .replace(/\u0092/g, 'í')
      .replace(/'/g, 'í')
      .replace(/'/g, 'í')
      .replace(/'/g, 'í')
      // ś / œ → ú (Maipú)
      .replace(/ś/g, 'ú')
      .replace(/œ/g, 'ú')
      .replace(/\u009C/g, 'ú')
      // Ľ / ¼ → º (Nº)
      .replace(/Ľ/g, 'º')
      .replace(/¼/g, 'º')
      .replace(/\u00BC/g, 'º')
      // – (en dash) → ñ (Porteña, Peña…)
      .replace(/–/g, 'ñ')
      .replace(/\u0096/g, 'ñ')
      // — (em dash) → ó (gestión, educación…)
      .replace(/—/g, 'ó')
      .replace(/\u0097/g, 'ó')
      // Ž → é (José, Belén…)
      .replace(/Ž/g, 'é')
      .replace(/\u008E/g, 'é')
      // ‡ → á (Básica, Tucumán…)
      .replace(/‡/g, 'á')
      .replace(/\u0087/g, 'á')
      // Ÿ → ú (Güemes…)
      .replace(/Ÿ/g, 'ú')
      .replace(/\u009F/g, 'ú')
      // Separador corrupto
      .replace(/¥/g, ' y ')
      .replace(/\u00A5/g, ' y ')
      // Otros caracteres sueltos frecuentes en el archivo
      .replace(/\u008D/g, '')
      .replace(/\uFFFD/g, '')
  );
}

function stripPhoneSuffix(text) {
  return text
    .replace(/\s*-\s*www\.\S+.*$/i, '')
    .replace(/\s*-\s*\d{2}[-\s]?\d{3,}.*$/, '')
    .replace(/,?\s*\d{2}[-\s]?\d{4,}.*$/, '')
    .replace(/\.\s*TE?:\s*[\d\s-]*.*$/i, '')
    .replace(/\s+Te\s*:?\s*[\d\s-]*.*$/i, '')
    .replace(/\s+Te\s+[\d\s-]+.*$/i, '')
    .replace(/\s+TE:\s*[\d\s-]*.*$/i, '')
    .replace(/\.\s*TE:\s*$/i, '')
    .replace(/\s+Te:\s*$/i, '')
    .trim();
}

/** Normaliza direcciones para mejorar hits en Nominatim. */
function normalizeAddressForGeocode(direccion) {
  let d = stripPhoneSuffix(direccion);
  d = d.replace(/\besq\.?\s*/gi, ' ');
  d = d.replace(/\be\/\s*/gi, ' y ');
  d = d.replace(/\s*\(Vela\)\s*/gi, ', Vela');
  d = d.replace(/\bPje\.\s*/gi, 'Pasaje ');
  d = d.replace(/\bAv\.\s*/gi, 'Avenida ');
  d = d.replace(/\bGral\.?\s*/gi, 'General ');
  d = d.replace(/\s+/g, ' ').trim();
  return d;
}

function isAddressContinuationLine(line) {
  if (SECTION_HEADER.test(line) || INSTITUTION_LINE.test(line)) return false;
  if (/\b(Te|TE)\s*[:.]?\s*\d/i.test(line)) return true;
  if (/^\d+\s/.test(line)) return true;
  if (/^(Esc\.|Jard[ií]n|SEIMM|Colegio|Inst\.)/i.test(line)) return false;
  return line.length > 4;
}

function extractAddressFromInstitutionLine(line) {
  const teIdx = line.search(/\bTe\s*:/i);
  if (teIdx === -1) return null;

  const beforeTe = line.slice(0, teIdx).trim();
  const afterMarkers = beforeTe.split(/¥| y /);
  const tail = (afterMarkers[afterMarkers.length - 1] || '').trim();
  const commaParts = tail.split(',').map((p) => p.trim()).filter(Boolean);
  const candidate = commaParts.length ? commaParts[commaParts.length - 1] : tail;

  if (candidate && /\d|s\/n|e\/|Pje\.|Av\.|Ruta/i.test(candidate)) {
    return stripPhoneSuffix(candidate);
  }
  return stripPhoneSuffix(tail);
}

function parseSchoolEntries(rawText) {
  const text = fixEncoding(rawText);
  const lines = text
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter(Boolean);

  const entries = [];
  let pendingName = null;

  for (const line of lines) {
    if (SECTION_HEADER.test(line)) {
      pendingName = null;
      continue;
    }

    // Línea de institución con dirección embebida (p. ej. E.E.M. … Santamarina 851 Te: …)
    if (INSTITUTION_LINE.test(line) && /\bTe\s*:/i.test(line)) {
      const nombre = stripPhoneSuffix(line.replace(/\s*Te:.*$/i, '').trim());
      const direccion = extractAddressFromInstitutionLine(line);
      if (direccion) {
        entries.push({ nombre, direccion });
      } else {
        console.warn(`[parser] Sin dirección extraíble en línea institución: ${line}`);
      }
      pendingName = null;
      continue;
    }

    // Nombre en una línea, dirección en la siguiente (secundarias)
    if (INSTITUTION_LINE.test(line) && line.split(',').length < 3) {
      pendingName = line.replace(/\.\s*$/, '').trim();
      continue;
    }

    if (pendingName && isAddressContinuationLine(line)) {
      let direccion = normalizeAddressForGeocode(line);
      const parajeInLine = line.match(/\(([^)]+)\)/);
      const phoneOnly = /^[\d\s()-]+$/.test(direccion.replace(/[(),]/g, '').trim());
      if (phoneOnly || direccion.length < 4) {
        const paraje =
          parajeInLine?.[1] ||
          pendingName.match(/\(([^)]+)\)/)?.[1] ||
          'Gardey';
        direccion = `${paraje}, Buenos Aires`;
      }
      if (direccion) {
        entries.push({ nombre: pendingName, direccion });
      }
      pendingName = null;
      continue;
    }

    pendingName = null;

    const parenOnly = line.match(/^(.+?)\s*\(([^)]+)\)\s*,?\s*$/);
    if (parenOnly && !line.includes(',', line.indexOf('('))) {
      entries.push({
        nombre: parenOnly[1].trim(),
        direccion: `${parenOnly[2].trim()}, Tandil`,
      });
      continue;
    }

    const parts = line
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length < 2) continue;

    const nombre = parts[0];
    let direccion = stripPhoneSuffix(parts.slice(1).join(', '));
    if (!direccion) continue;

    if (/^(Esc\.|Jard[ií]n|SEIMM|Colegio|Inst\.)/i.test(nombre)) {
      entries.push({ nombre, direccion });
    }
  }

  const seen = new Set();
  return entries.filter((e) => {
    const key = `${e.nombre}|${e.direccion}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodeAddress(direccion) {
  const normalized = normalizeAddressForGeocode(direccion);
  const q = `${normalized}, Tandil, Argentina`;
  const url = `${NOMINATIM_URL}?${new URLSearchParams({
    q,
    format: 'json',
    limit: '1',
  })}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`Nominatim HTTP ${res.status}`);
  }

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  const lat = parseFloat(data[0].lat);
  const lng = parseFloat(data[0].lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  return { lat, lng, displayName: data[0].display_name };
}

function writeResults(results) {
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2), 'utf8');
}

async function main() {
  console.log('=== Geocoding educación Tandil ===\n');

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`No se encontró: ${INPUT_FILE}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(INPUT_FILE);
  const schools = parseSchoolEntries(raw.toString('latin1'));

  console.log(`Archivo: ${INPUT_FILE}`);
  console.log(`Establecimientos a geocodificar: ${schools.length}`);
  console.log(`Delay entre consultas: ${DELAY_MS}ms\n`);

  const results = [];
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < schools.length; i++) {
    const { nombre, direccion } = schools[i];
    const progress = `[${i + 1}/${schools.length}]`;

    console.log(`${progress} ${nombre}`);
    const queryAddress = normalizeAddressForGeocode(direccion);
    console.log(`  → Consultando: ${queryAddress}, Tandil, Argentina`);

    try {
      const hit = await geocodeAddress(direccion);

      if (hit) {
        const poi = {
          nombre,
          lat: hit.lat,
          lng: hit.lng,
          categoria: 'educacion',
        };
        results.push(poi);
        ok++;
        console.log(`  ✓ ${hit.lat.toFixed(5)}, ${hit.lng.toFixed(5)} — ${hit.displayName}`);
      } else {
        fail++;
        console.warn(`  ✗ Sin resultados en Nominatim para: ${nombre} — ${direccion}`);
      }
    } catch (err) {
      fail++;
      console.warn(`  ✗ Error: ${err.message} — ${nombre} — ${direccion}`);
    }

    writeResults(results);

    if (i < schools.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log('\n=== Resumen ===');
  console.log(`Geocodificados: ${ok}`);
  console.log(`Fallidos:     ${fail}`);
  console.log(`Total en JSON: ${results.length}`);
  console.log(`\n✓ Guardado: ${OUTPUT_FILE}`);
  console.log('\nSiguiente paso: npm run geo:process');
}

main().catch((err) => {
  console.error('Falló el geocoder:', err);
  process.exit(1);
});
