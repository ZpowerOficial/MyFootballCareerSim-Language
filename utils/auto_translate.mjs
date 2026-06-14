#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

// Resolve to repository `src/locales` (script is in src/locales/utils)
const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const localesDir = path.resolve(scriptDir, '..');

function listJsonFiles(dir) {
  const res = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) res.push(...listJsonFiles(full));
    else if (name.endsWith('.json')) res.push(full);
  }
  return res;
}

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function saveJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8');
}

function flattenStrings(obj, pathSoFar = []) {
  const entries = [];
  if (typeof obj === 'string') return [{ path: pathSoFar, value: obj }];
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => entries.push(...flattenStrings(v, pathSoFar.concat(String(i)))));
    return entries;
  }
  if (obj && typeof obj === 'object') {
    for (const k of Object.keys(obj)) entries.push(...flattenStrings(obj[k], pathSoFar.concat(k)));
    return entries;
  }
  return [];
}

function setAtPath(obj, pathArr, value) {
  let cur = obj;
  for (let i = 0; i < pathArr.length - 1; i++) {
    const key = pathArr[i];
    if (!(key in cur)) cur[key] = {};
    cur = cur[key];
  }
  cur[pathArr[pathArr.length - 1]] = value;
}

async function translateTexts(texts, from, to, provider, key, url) {
  if (texts.length === 0) return [];
  const SEP = '\n|||\n';
  const joined = texts.join(SEP);
  if (provider === 'deepl') {
    const endpoint = (url && url.length) ? url : 'https://api-free.deepl.com/v2/translate';
    const form = new URLSearchParams();
    form.append('auth_key', key);
    form.append('text', joined);
    form.append('source_lang', from.toUpperCase());
    form.append('target_lang', to.toUpperCase());
    const res = await fetch(endpoint, { method: 'POST', body: form });
    if (!res.ok) throw new Error(`DeepL error ${res.status}`);
    const j = await res.json();
    const t = j.translations && j.translations[0] && j.translations[0].text;
    return t.split(SEP);
  } else if (provider === 'libre') {
    const endpoint = (url && url.length) ? url : 'https://libretranslate.de/translate';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: joined, source: from, target: to, format: 'text' })
    });
    if (!res.ok) throw new Error(`LibreTranslate error ${res.status}`);
    const j = await res.json();
    // LibreTranslate may return an object or array
    const text = Array.isArray(j) ? j.map(x => x.translatedText).join('') : j.translatedText;
    return text.split(SEP);
  }
  throw new Error('Unsupported provider: ' + provider);
}

async function main() {
  const provider = (process.env.TRANSLATE_PROVIDER || 'libre').toLowerCase();
  const key = process.env.TRANSLATE_KEY || '';
  const deeplUrl = process.env.DEEPL_URL || '';
  const srcLang = 'en';
  const locales = fs.readdirSync(localesDir).filter(d => {
    const full = path.join(localesDir, d);
    return fs.statSync(full).isDirectory() && d !== 'utils' && d !== '.git' && !d.startsWith('.');
  });

  const enDir = path.join(localesDir, srcLang);
  if (!fs.existsSync(enDir)) {
    console.error('English source directory not found:', enDir);
    process.exit(1);
  }

  if (provider === 'deepl' && !key) {
    console.error('DeepL selected but TRANSLATE_KEY not set. Please set env TRANSLATE_PROVIDER=deepl and TRANSLATE_KEY=YOUR_KEY');
    process.exit(1);
  }

  const enFiles = listJsonFiles(enDir);

  for (const loc of locales) {
    if (loc === srcLang) continue;
    console.log('Translating to', loc);
    for (const enFile of enFiles) {
      const rel = path.relative(enDir, enFile);
      const targetFile = path.join(localesDir, loc, rel);
      try {
        const enJson = loadJson(enFile);
        let tgtJson = {};
        if (fs.existsSync(targetFile)) {
          try { tgtJson = loadJson(targetFile); } catch (e) { tgtJson = {}; }
        }

        const flat = flattenStrings(enJson);
        const texts = flat.map(e => e.value);
        let translated = [];
        try {
          // attempt batch translate; if fails, fallback to per-text
          translated = await translateTexts(texts, srcLang, loc, provider, key, deeplUrl);
          if (!Array.isArray(translated) || translated.length !== texts.length) throw new Error('Batch translate returned invalid length');
        } catch (err) {
          console.warn('Batch translate failed for', rel, '– falling back to per-string:', err.message);
          translated = [];
          for (let i = 0; i < texts.length; i++) {
            try {
              const single = await translateTexts([texts[i]], srcLang, loc, provider, key, deeplUrl);
              translated.push(single[0] || (texts[i] + ' [EN]'));
            } catch (e) {
              translated.push(texts[i] + ' [EN]');
            }
            // small delay to be polite
            await new Promise(r => setTimeout(r, 120));
          }
        }
        for (let i = 0; i < flat.length; i++) {
          const p = flat[i].path;
          const out = translated[i] || (flat[i].value + ' [EN]');
          setAtPath(tgtJson, p, out);
        }

        // ensure dir exists
        fs.mkdirSync(path.dirname(targetFile), { recursive: true });
        saveJson(targetFile, tgtJson);
        console.log(' Wrote', targetFile);
      } catch (e) {
        console.error('Failed', rel, e.message);
      }
    }
  }
  console.log('Translation run complete.');
}

main().catch(err => { console.error(err); process.exit(1); });
