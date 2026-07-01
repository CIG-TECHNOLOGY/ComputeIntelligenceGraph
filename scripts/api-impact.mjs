import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SOURCE_EXACT_PATHS = new Set([
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.json',
  'tsconfig.base.json',
  'packages/infra/docker/Dockerfile.api',
  'packages/api/package.json',
  'packages/api/tsconfig.json',
  'packages/api/scripts/copy-migrations.mjs',
  'packages/auth/package.json',
  'packages/auth/tsconfig.json',
  'packages/config/package.json',
  'packages/config/tsconfig.json',
  'packages/graph/package.json',
  'packages/graph/tsconfig.json',
  'packages/discovery/package.json',
  'packages/discovery/tsconfig.json',
]);

const SOURCE_PREFIXES = [
  'packages/api/src/',
  'packages/auth/src/',
  'packages/config/src/',
  'packages/graph/src/',
  'packages/discovery/src/',
  'packages/emails/src/templates/',
];

const RUNTIME_EXACT_PATHS = new Set([
  'packages/infra/package.json',
  'packages/infra/tsconfig.json',
  'packages/infra/infra.config.ts',
  'packages/infra/sst.config.ts',
  'packages/infra/sst-env.d.ts',
  '.github/workflows/deploy-api.yml',
  '.github/workflows/bootstrap-api-pipelines.yml',
]);

const RUNTIME_PREFIXES = [
  'packages/infra/src/',
  'packages/infra/scripts/',
  'packages/infra/config/',
  'packages/iac/',
];

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/');
}

function isUnderPrefix(filePath, prefix) {
  return filePath === prefix || filePath.startsWith(prefix);
}

function isTestPath(filePath) {
  return (
    filePath.includes('/__tests__/') ||
    /(?:^|\/)[^/]+(?:\.test|\.spec)\.[^/]+$/.test(filePath) ||
    /(?:^|\/)[^/]+(?:\.test|\.spec)$/.test(filePath)
  );
}

function isPackageJsonPath(filePath) {
  return filePath === 'package.json' || filePath.endsWith('/package.json');
}

async function isVersionOnlyPackageJsonChange(baseRef, headRef, filePath, readTextAtRef) {
  try {
    return isVersionOnlyPackageJsonDiff(
      await readTextAtRef(baseRef, filePath),
      await readTextAtRef(headRef, filePath)
    );
  } catch {
    return false;
  }
}

function stableSortValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => stableSortValue(entry));
  }

  if (value && typeof value === 'object') {
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = stableSortValue(value[key]);
    }
    return sorted;
  }

  return value;
}

export function normalizePackageJsonText(text) {
  const parsed = JSON.parse(text);

  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    delete parsed.version;
  }

  return JSON.stringify(stableSortValue(parsed));
}

export function isVersionOnlyPackageJsonDiff(baseText, headText) {
  try {
    return normalizePackageJsonText(baseText) === normalizePackageJsonText(headText);
  } catch {
    return false;
  }
}

export function isApiSourcePath(filePath) {
  const normalized = normalizePath(filePath);

  if (isTestPath(normalized)) {
    return false;
  }

  if (SOURCE_EXACT_PATHS.has(normalized)) {
    return true;
  }

  return SOURCE_PREFIXES.some((prefix) => isUnderPrefix(normalized, prefix));
}

export function isApiRuntimePath(filePath) {
  const normalized = normalizePath(filePath);

  if (isTestPath(normalized)) {
    return false;
  }

  if (RUNTIME_EXACT_PATHS.has(normalized)) {
    return true;
  }

  return RUNTIME_PREFIXES.some((prefix) => isUnderPrefix(normalized, prefix));
}

export function isApiSourceFingerprintPath(filePath) {
  return isApiSourcePath(filePath);
}

export async function computeApiSourceFingerprint({
  listFiles,
  readText,
} = {}) {
  const files = await (listFiles
    ? listFiles()
    : listTrackedFiles());

  const sortedFiles = files
    .map((filePath) => normalizePath(filePath))
    .filter((filePath) => isApiSourceFingerprintPath(filePath))
    .sort();

  const hash = createHash('sha256');

  for (const filePath of sortedFiles) {
    const content = await readText(filePath);
    const normalizedContent = isPackageJsonPath(filePath)
      ? normalizePackageJsonText(content)
      : content;

    hash.update(filePath);
    hash.update('\0');
    hash.update(normalizedContent);
    hash.update('\0');
  }

  return hash.digest('hex');
}

async function listTrackedFiles() {
  const { stdout } = await execFileAsync('git', ['ls-files'], {
    maxBuffer: 10 * 1024 * 1024,
  });

  return stdout
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function readCurrentText(filePath) {
  return readFile(filePath, 'utf8');
}

async function readGitTextAtRef(ref, filePath) {
  const { stdout } = await execFileAsync('git', ['show', `${ref}:${filePath}`], {
    maxBuffer: 10 * 1024 * 1024,
  });

  return stdout;
}

async function listChangedFiles(baseRef, headRef) {
  const { stdout } = await execFileAsync(
    'git',
    ['diff', '--name-only', '--diff-filter=ACMRTUXB', baseRef, headRef],
    {
      maxBuffer: 10 * 1024 * 1024,
    }
  );

  return stdout
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export async function classifyApiImpact({
  changedFiles,
  baseRef,
  headRef,
  readTextAtRef,
} = {}) {
  const normalizedChangedFiles = [...new Set((changedFiles ?? []).map(normalizePath))].sort();
  let apiSourceChanged = false;
  let apiRuntimeChanged = false;

  for (const filePath of normalizedChangedFiles) {
    if (isApiSourcePath(filePath)) {
      if (
        isPackageJsonPath(filePath) &&
        baseRef &&
        headRef &&
        readTextAtRef &&
        await isVersionOnlyPackageJsonChange(baseRef, headRef, filePath, readTextAtRef)
      ) {
        continue;
      }

      apiSourceChanged = true;
      continue;
    }

    if (isApiRuntimePath(filePath)) {
      if (
        isPackageJsonPath(filePath) &&
        baseRef &&
        headRef &&
        readTextAtRef &&
        await isVersionOnlyPackageJsonChange(baseRef, headRef, filePath, readTextAtRef)
      ) {
        continue;
      }

      apiRuntimeChanged = true;
    }
  }

  return {
    apiSourceChanged,
    apiRuntimeChanged,
    releaseMetadataOnly:
      normalizedChangedFiles.length > 0 && !apiSourceChanged && !apiRuntimeChanged,
    hasRelevantChanges: apiSourceChanged || apiRuntimeChanged,
  };
}

export async function detectApiImpact({
  baseRef,
  headRef = 'HEAD',
  changedFiles,
  listFiles,
  readText,
  readTextAtRef,
} = {}) {
  const diffFiles =
    changedFiles ??
    (baseRef ? await listChangedFiles(baseRef, headRef) : []);

  const impact = await classifyApiImpact({
    changedFiles: diffFiles,
    baseRef,
    headRef,
    readTextAtRef,
  });

  const apiSourceFingerprint = await computeApiSourceFingerprint({
    listFiles,
    readText: readText ?? readCurrentText,
  });

  return {
    ...impact,
    apiSourceFingerprint,
    apiSourceTag: `api-src-${apiSourceFingerprint}`,
  };
}

export async function defaultReadTextAtRef(ref, filePath) {
  return readGitTextAtRef(ref, filePath);
}
