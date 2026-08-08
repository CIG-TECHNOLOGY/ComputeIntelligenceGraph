#!/usr/bin/env node
/**
 * migrate-workflows.mjs
 *
 * Opens a PR against a tenant's GitHub repo adding the default git-ci
 * onboarding workflows under .forgejo/workflows/, plus a copy of
 * relay-check-to-github.mjs under .forgejo/scripts/ so each workflow can
 * call it locally without depending on network access back to CIG's own
 * repo. These files must live in the tenant's GitHub repo (not be added
 * directly on the Forgejo side) — the one-way push-mirror carries them to
 * Forgejo on every push, and a commit added only on the Forgejo side would
 * be clobbered by the next mirrored push from GitHub.
 *
 * Usage:
 *   node scripts/migrate-workflows.mjs --github-repo hashpass-tech/hashpass.tech --slug hashpass
 *
 * Requires the `gh` CLI, authenticated with access to the tenant's repo.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";
import { parseArgs } from "node:util";

const TEMPLATES_DIR = new URL("../templates", import.meta.url).pathname;
const RELAY_SCRIPT = new URL("./relay-check-to-github.mjs", import.meta.url).pathname;

const { values: args } = parseArgs({
  options: {
    "github-repo": { type: "string" },
    slug:         { type: "string" },
    help:         { type: "boolean", short: "h" },
  },
});

if (args.help || !args["github-repo"] || !args.slug) {
  console.log(`
Usage: migrate-workflows.mjs --github-repo <owner/repo> --slug <tenant-slug>
`);
  process.exit(0);
}

function sh(cmd, opts = {}) {
  return execSync(cmd, { stdio: "inherit", ...opts });
}

const repoName = args["github-repo"].split("/").pop();
const workdir = fs.mkdtempSync(path.join(os.tmpdir(), `git-ci-migrate-${repoName}-`));
const branch = `git-ci/onboard-${args.slug}`;

console.log(`Cloning ${args["github-repo"]} into ${workdir}…`);
sh(`gh repo clone ${args["github-repo"]} ${workdir} -- --depth 1`);

sh(`git checkout -b ${branch}`, { cwd: workdir });

const destDir = path.join(workdir, ".forgejo", "workflows");
fs.mkdirSync(destDir, { recursive: true });

const templates = fs.readdirSync(TEMPLATES_DIR).filter((f) => f.endsWith(".forgejo.yml"));
if (templates.length === 0) {
  console.error(`No templates found in ${TEMPLATES_DIR}`);
  process.exit(1);
}

// Templates reference the tenant's real GitHub owner/repo via placeholders
// rather than Forgejo's `github.repository_owner`/`github.repository`
// context, because those resolve to the Forgejo org/repo name — which is
// not guaranteed to match the tenant's actual GitHub owner/repo (the
// Forgejo org slug is chosen independently during provisioning).
const [githubOwner, githubRepoName] = args["github-repo"].split("/");

for (const file of templates) {
  const contents = fs
    .readFileSync(path.join(TEMPLATES_DIR, file), "utf8")
    .replaceAll("__GITHUB_OWNER__", githubOwner)
    .replaceAll("__GITHUB_REPO__", githubRepoName);
  fs.writeFileSync(path.join(destDir, file), contents);
  console.log(`  + .forgejo/workflows/${file}`);
}

const scriptsDir = path.join(workdir, ".forgejo", "scripts");
fs.mkdirSync(scriptsDir, { recursive: true });
fs.copyFileSync(RELAY_SCRIPT, path.join(scriptsDir, "relay-check-to-github.mjs"));
console.log(`  + .forgejo/scripts/relay-check-to-github.mjs`);

sh(`git add .forgejo`, { cwd: workdir });
sh(`git -c user.name="cig-git-ci-bot" -c user.email="git-ci@cig.technology" commit -m "chore(git-ci): add default CI fallback onboarding workflows"`, { cwd: workdir });
sh(`git push -u origin ${branch}`, { cwd: workdir });

sh(
  `gh pr create --repo ${args["github-repo"]} --head ${branch} ` +
    `--title "chore: onboard CIG git-ci CI fallback" ` +
    `--body "Adds the default secret-scan / coverage / Semgrep checks as Forgejo Actions workflows under .forgejo/workflows/. These mirror to ci.cig.technology/${args.slug} via the repo's push-mirror and run there as a GitHub-independent CI fallback during a GitHub Actions platform outage. See docs/git-ci-outage-runbook.md in CIG's ComputeIntelligenceGraph repo for the operating model."`,
  { cwd: workdir }
);

fs.rmSync(workdir, { recursive: true, force: true });
console.log(`\n✓ Onboarding PR opened on ${args["github-repo"]} (branch ${branch})`);
