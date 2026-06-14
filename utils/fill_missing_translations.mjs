#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const localesRoot = path.resolve(new URL(import.meta.url).pathname, '..');
// localesRoot points to src/locales/utils; we want parent (src/locales)
const localesDir = path.resolve(localesRoot, '..');

function listFiles(dir) {
  const res = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      res.push(...listFiles(full));
    } else {
      res.push(full);
    }
  }
  return res;
}

function isJsonFile(p) {
  return p.endsWith('.json');
}

function ensureDirExists(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function deepMergeWithPlaceholders(target, source) {
  // mutate target, add missing keys from source. If key missing, copy source value and mark with [EN]
  for (const key of Object.keys(source)) {
    const sVal = source[key];
    const tVal = target[key];
    if (tVal === undefined) {
      // add placeholder
      if (typeof sVal === 'string') target[key] = `${sVal} [EN]`;
      else if (Array.isArray(sVal)) target[key] = sVal.slice();
      else if (sVal && typeof sVal === 'object') target[key] = JSON.parse(JSON.stringify(sVal));
      else target[key] = sVal;
    } else if (sVal && typeof sVal === 'object' && !Array.isArray(sVal) && tVal && typeof tVal === 'object' && !Array.isArray(tVal)) {
      deepMergeWithPlaceholders(tVal, sVal);
    }
  }
}

function run() {
  const enDir = path.join(localesDir, 'en');
  if (!fs.existsSync(enDir)) {
    console.error('English locales directory not found:', enDir);
    process.exit(1);
  }

  const enFiles = listFiles(enDir).filter(isJsonFile);

  const locales = fs.readdirSync(localesDir).filter(d => {
    const full = path.join(localesDir, d);
    return fs.statSync(full).isDirectory() && d !== 'en' && d !== 'utils';
  });

  const summary = {};

  for (const loc of locales) {
    summary[loc] = { created: 0, updated: 0 };
    for (const enFile of enFiles) {
      const rel = path.relative(enDir, enFile);
      const targetFile = path.join(localesDir, loc, rel);
      ensureDirExists(targetFile);
      const enContent = fs.readFileSync(enFile, 'utf8');
      let enJson;
      try { enJson = JSON.parse(enContent); } catch (e) { enJson = null; }

      if (!fs.existsSync(targetFile)) {
        // create copy with [EN] markers if JSON
        if (enJson && typeof enJson === 'object') {
          const marked = JSON.parse(JSON.stringify(enJson));
          // For top-level strings, append marker; otherwise keep same structure
          function mark(obj) {
            for (const k of Object.keys(obj)) {
              if (typeof obj[k] === 'string') obj[k] = `${obj[k]} [EN]`;
              else if (obj[k] && typeof obj[k] === 'object') mark(obj[k]);
            }
          }
          mark(marked);
          fs.writeFileSync(targetFile, JSON.stringify(marked, null, 2), 'utf8');
        } else {
          fs.writeFileSync(targetFile, enContent, 'utf8');
        }
        summary[loc].created++;
      } else {
        // merge missing keys into existing file
        if (enJson) {
          try {
            const tgtContent = fs.readFileSync(targetFile, 'utf8');
            const tgtJson = JSON.parse(tgtContent);
            const before = JSON.stringify(tgtJson).length;
            deepMergeWithPlaceholders(tgtJson, enJson);
            const after = JSON.stringify(tgtJson).length;
            if (after !== before) {
              fs.writeFileSync(targetFile, JSON.stringify(tgtJson, null, 2), 'utf8');
              summary[loc].updated++;
            }
          } catch (e) {
            // if parse error, skip
            continue;
          }
        }
      }
    }
  }

  console.log('Fill missing translations summary:');
  console.log(JSON.stringify(summary, null, 2));
}

run();
