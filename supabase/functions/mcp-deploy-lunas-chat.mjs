#!/usr/bin/env node
/**
 * Reads .mcp-deploy-full.json (node parse) and prints deploy args summary.
 * Full deploy is invoked via CallDynamicTool → deploy_edge_function.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jsonPath = path.join(__dirname, '.mcp-deploy-full.json');
const args = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const summary = {
  project_id: args.project_id,
  name: args.name,
  entrypoint_path: args.entrypoint_path,
  verify_jwt: args.verify_jwt,
  fileCount: args.files.length,
  totalBytes: JSON.stringify(args).length,
  files: args.files.map((f) => ({
    name: f.name,
    bytes: f.content.length,
    hasBuildHeuristic: f.content.includes('buildHeuristicReply'),
    hasDenoServe: f.content.includes('Deno.serve'),
    isStub: /PLACEHOLDER - will redeploy/.test(f.content),
  })),
};

console.log(JSON.stringify(summary, null, 2));
