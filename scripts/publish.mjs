import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function parseEnvFile(filePath) {
  const values = {};
  const raw = readFileSync(filePath, 'utf8');

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    values[key] = value;
  }

  return values;
}

const envCandidates = [
  path.join(projectRoot, '.env.publish.local'),
  path.join(projectRoot, '.env.publish'),
];

const loadedEnvFiles = [];
const fileEnv = {};

for (const candidate of envCandidates) {
  if (!existsSync(candidate)) continue;
  Object.assign(fileEnv, parseEnvFile(candidate));
  loadedEnvFiles.push(path.basename(candidate));
}

const childEnv = {
  ...process.env,
  ...fileEnv,
};

if (!childEnv.GH_TOKEN) {
  console.error('Missing GH_TOKEN.');
  console.error('Create C:\\Users\\vhspe\\Documents\\DevTest\\BoldBrushAISuperPower\\.env.publish.local with:');
  console.error('GH_TOKEN=your_github_token');
  process.exit(1);
}

if (loadedEnvFiles.length > 0) {
  console.log(`Loaded publish env from ${loadedEnvFiles.join(', ')}.`);
} else {
  console.log('No project publish env file found, falling back to current process env.');
}

const electronBuilderBin = path.join(projectRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder');
const child = spawn(electronBuilderBin, ['--publish', 'always'], {
  cwd: projectRoot,
  env: childEnv,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('error', (error) => {
  console.error('Failed to start electron-builder:', error instanceof Error ? error.message : error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
