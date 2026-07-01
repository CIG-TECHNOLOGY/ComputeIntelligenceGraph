import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(scriptDir, '..');
const readmePath = resolve(pkgDir, 'README.md');
const githubReleasesUrl = 'https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/releases';

execFileSync(
  'versioning',
  [
    'update-readme',
    '--readme',
    'README.md',
    '--changelog',
    'CHANGELOG.md',
    '--pkg',
    'package.json',
  ],
  {
    cwd: pkgDir,
    stdio: 'inherit',
  }
);

const readme = readFileSync(readmePath, 'utf8')
  .replace(
    'https://github.com/edcalderon/my-second-brain/releases',
    githubReleasesUrl
  )
  .replace(/\.\/+CHANGELOG\.md/g, './CHANGELOG.md');

writeFileSync(readmePath, readme);
