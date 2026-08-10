import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const sourceRoot = path.resolve(projectRoot, 'src', 'contracts', 'managed', 'clinical-trial-matcher');
const targetRoot = path.resolve(projectRoot, 'public', 'zk', 'clinical-trial-matcher');

if (!fs.existsSync(sourceRoot)) {
  throw new Error('Missing compiled Midnight assets. Run npm run compile:midnight first.');
}

fs.mkdirSync(targetRoot, { recursive: true });

for (const entry of ['keys', 'zkir']) {
  const sourcePath = path.join(sourceRoot, entry);
  const targetPath = path.join(targetRoot, entry);

  if (!fs.existsSync(sourcePath)) continue;

  fs.rmSync(targetPath, { recursive: true, force: true });
  fs.cpSync(sourcePath, targetPath, { recursive: true });
}

console.log(`Synced Midnight assets to ${path.relative(projectRoot, targetRoot)}`);
