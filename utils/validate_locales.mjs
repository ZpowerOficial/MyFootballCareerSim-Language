#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = path.resolve(new URL(import.meta.url).pathname, '..', '..');

function listJson(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) out.push(...listJson(full));
    else if (name.endsWith('.json')) out.push(full);
  }
  return out;
}

const files = listJson(root);
const report = { valid: [], invalid: [] };
for (const f of files) {
  try {
    const s = fs.readFileSync(f, 'utf8');
    JSON.parse(s);
    report.valid.push(f);
  } catch (e) {
    report.invalid.push({ file: f, error: e.message });
  }
}

console.log('Locale JSON validation:');
console.log(' Valid:', report.valid.length);
console.log(' Invalid:', report.invalid.length);
if (report.invalid.length) console.log(JSON.stringify(report.invalid, null, 2));

process.exit(report.invalid.length ? 2 : 0);
