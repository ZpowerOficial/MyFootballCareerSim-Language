#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const localesDir = path.resolve(new URL(import.meta.url).pathname, '..', '..');

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
    return fs.statSync(full).isDirectory() && d !== 'utils' && !d.startsWith('.');
  });

  const enDir = path.join(localesDir, srcLang);
  if (!fs.existsSync(enDir)) {
    console.error('English source directory not found:', enDir);
    process.exit(1);
  }

  const enFiles = listJsonFiles(enDir);

  for (const loc of locales) {
    if (loc === srcLang) continue;
    console.log('Processing locale', loc);
    for (const enFile of enFiles) {
      const rel = path.relative(enDir, enFile);
      const targetFile = path.join(localesDir, loc, rel);
      try {
        const enJson = loadJson(enFile);
        let tgtJson = {};
        if (fs.existsSync(targetFile)) {
          try { tgtJson = loadJson(targetFile); } catch (e) { tgtJson = {}; }
        }

        const flatEn = flattenStrings(enJson);
        const flatTgt = flattenStrings(tgtJson);
        const tgtMap = new Map(flatTgt.map(e => [e.path.join('.'), e.value]));

        const toTranslate = [];
        const translateIndex = [];
        for (let i = 0; i < flatEn.length; i++) {
          const p = flatEn[i].path;
          const key = p.join('.');
          const enVal = flatEn[i].value;
          const tVal = tgtMap.get(key);
          const needs = (tVal === undefined) || (typeof tVal === 'string' && tVal.includes('[EN]')) || (tVal === enVal + ' [EN]');
          if (needs) {
            toTranslate.push(enVal);
            translateIndex.push(p);
          }
        }

        if (toTranslate.length === 0) continue;

        // translate in small chunks to avoid rate-limit/html errors
        const CHUNK = 8;
        const translated = [];
        for (let start = 0; start < toTranslate.length; start += CHUNK) {
          const chunk = toTranslate.slice(start, start + CHUNK);
          try {
            const part = await translateTexts(chunk, srcLang, loc, provider, key, deeplUrl);
            if (!Array.isArray(part) || part.length !== chunk.length) throw new Error('Invalid chunk result');
            translated.push(...part);
          } catch (err) {
            console.warn('Chunk translate failed for', rel, 'chunk', start, '– falling back per-string:', err.message);
            for (let i = 0; i < chunk.length; i++) {
              try {
                const single = await translateTexts([chunk[i]], srcLang, loc, provider, key, deeplUrl);
                translated.push(single[0] || (chunk[i] + ' [EN]'));
              } catch (e) {
                translated.push(chunk[i] + ' [EN]');
              }
              await new Promise(r => setTimeout(r, 150));
            }
          }
          // polite pause between chunks
          await new Promise(r => setTimeout(r, 220));
        }

        for (let i = 0; i < translateIndex.length; i++) {
          setAtPath(tgtJson, translateIndex[i], translated[i]);
        }

        fs.mkdirSync(path.dirname(targetFile), { recursive: true });
        saveJson(targetFile, tgtJson);
        console.log(' Wrote', targetFile, 'translated', translateIndex.length, 'strings');
      } catch (e) {
        console.error('Failed', rel, e.message);
      }
    }
  }
  console.log('Placeholder translation run complete.');
}

main().catch(err => { console.error(err); process.exit(1); });
