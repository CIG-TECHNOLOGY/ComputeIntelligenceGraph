#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const options = new Map();

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--version' || arg === '--tag' || arg === '--date') {
    const value = args[i + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${arg}`);
    }
    options.set(arg.slice(2), value);
    i += 1;
  } else {
    throw new Error(`Unknown argument: ${arg}`);
  }
}

const version = options.get('version');
const tag = options.get('tag');
const date = options.get('date');

if (!version || !tag || !date) {
  console.error('Usage: node scripts/sync-release-status.mjs --version <version> --tag <tag> --date <YYYY-MM-DD>');
  process.exit(1);
}

const rootDir = process.cwd();
const readmePath = path.join(rootDir, 'README.md');
const projectStatusPath = path.join(rootDir, 'PROJECT_STATUS.md');
const docsProjectStatusPath = path.join(rootDir, 'apps/docs/docs/en/project-status.md');
const githubReleasesUrl = 'https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/releases';

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function writeText(filePath, content) {
  fs.writeFileSync(filePath, `${content.replace(/\s+$/, '')}\n`);
}

function ensureLatestChangesSection(readmeContent) {
  const heading = '## 📋 Latest Changes';
  if (readmeContent.includes(heading)) {
    return readmeContent;
  }

  const section = [
    heading,
    '',
    'This section is maintained by the release workflow and mirrors the latest changelog entry.',
    '',
  ].join('\n');

  const anchor = '\n## Current Product State\n';
  if (readmeContent.includes(anchor)) {
    return readmeContent.replace(anchor, `\n${section}${anchor.trimStart()}`);
  }

  return `${readmeContent}\n${section}`;
}

function replaceOrThrow(content, pattern, replacement, filePath) {
  if (!pattern.test(content)) {
    throw new Error(`Expected pattern not found in ${filePath}`);
  }

  return content.replace(pattern, replacement);
}

const readme = ensureLatestChangesSection(readText(readmePath))
  .replace(
    'https://github.com/edcalderon/my-second-brain/releases',
    githubReleasesUrl
  );
writeText(readmePath, readme);

const projectStatus = readText(projectStatusPath);
const updatedProjectStatus = replaceOrThrow(
  replaceOrThrow(
    replaceOrThrow(
      projectStatus,
      /^Last updated:\s.*$/m,
      `Last updated: ${date}`,
      projectStatusPath
    ),
    /^Version:\s.*$/m,
    `Version: ${version}`,
    projectStatusPath
  ),
  /^Latest released tag:\s.*$/m,
  `Latest released tag: \`${tag}\``,
  projectStatusPath
);
writeText(projectStatusPath, updatedProjectStatus);

const docsProjectStatus = readText(docsProjectStatusPath);
const updatedDocsProjectStatus = replaceOrThrow(
  replaceOrThrow(
    docsProjectStatus,
    /- Version:\s`.*?`$/m,
    `- Version: \`${version}\``,
    docsProjectStatusPath
  ),
  /- Latest released tag:\s`.*?`$/m,
  `- Latest released tag: \`${tag}\``,
  docsProjectStatusPath
);
writeText(docsProjectStatusPath, updatedDocsProjectStatus);

console.log(`Synced release status to ${version} / ${tag}`);
