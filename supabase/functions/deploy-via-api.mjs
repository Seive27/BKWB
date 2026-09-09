#!/usr/bin/env node
/**
 * Deploy lunas-chat via Supabase Management API using payload from .mcp-deploy-full.json.
 * Requires SUPABASE_ACCESS_TOKEN in environment.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('SUPABASE_ACCESS_TOKEN not set');
  process.exit(1);
}

const args = JSON.parse(fs.readFileSync(path.join(__dirname, '.mcp-deploy-full.json'), 'utf8'));
const { project_id, name, entrypoint_path, verify_jwt, files } = args;

const metadata = JSON.stringify({
  name,
  entrypoint_path,
  verify_jwt,
});

const form = new FormData();
form.append('metadata', metadata);
for (const file of files) {
  form.append('file', new Blob([file.content], { type: 'text/plain' }), file.name);
}

const url = `https://api.supabase.com/v1/projects/${project_id}/functions/deploy?slug=${encodeURIComponent(name)}`;
const res = await fetch(url, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: form,
});

const text = await res.text();
let body;
try {
  body = JSON.parse(text);
} catch {
  body = { raw: text.slice(0, 500) };
}

if (!res.ok) {
  console.error(JSON.stringify({ ok: false, status: res.status, body }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, status: res.status, result: body }, null, 2));
