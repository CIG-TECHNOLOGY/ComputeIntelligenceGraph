#!/usr/bin/env node
/**
 * relay-check-to-github.mjs
 *
 * Final step of every tenant onboarding workflow (see templates/*.forgejo.yml).
 * Posts a named check-run to the tenant's OWN GitHub repo via the Checks
 * API, so their existing branch-protection rules are satisfied without a
 * manual --admin merge bypass, even while GitHub Actions itself is down.
 *
 * The token used is FORGEJO_RELAY_TOKEN, which Forgejo injects as a job
 * secret from the tenant's own org-level secrets store (configured once by
 * provision-tenant.mjs) — this script only ever reads it from the
 * environment, it never resolves or stores it itself, so a leak here can
 * only ever affect the one tenant whose token it is.
 *
 * Usage (called from a Forgejo Actions workflow step):
 *   FORGEJO_RELAY_TOKEN=$${{ secrets.FORGEJO_RELAY_TOKEN }} \
 *   node scripts/relay-check-to-github.mjs \
 *     --owner hashpass-tech --repo hashpass.tech \
 *     --check-name "git-ci / secret-scan" --conclusion success \
 *     --sha $${{ env.GITHUB_MIRROR_SHA }} \
 *     --details-url https://ci.cig.technology/hashpass/hashpass.tech/actions
 */

import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    owner:        { type: "string" },
    repo:         { type: "string" },
    "check-name": { type: "string" },
    conclusion:   { type: "string" }, // success | failure | neutral | cancelled | timed_out | action_required
    sha:          { type: "string" },
    "details-url": { type: "string" },
    help:         { type: "boolean", short: "h" },
  },
});

if (args.help || !args.owner || !args.repo || !args["check-name"] || !args.conclusion || !args.sha) {
  console.log(`
Usage: relay-check-to-github.mjs --owner <owner> --repo <repo> --check-name <name> \\
         --conclusion <success|failure|neutral|cancelled|timed_out|action_required> \\
         --sha <commit-sha> [--details-url <url>]

Requires FORGEJO_RELAY_TOKEN in the environment.
`);
  process.exit(0);
}

const token = process.env.FORGEJO_RELAY_TOKEN;
if (!token) {
  console.error("FORGEJO_RELAY_TOKEN is required in the environment (injected by Forgejo as a job secret)");
  process.exit(1);
}

const VALID_CONCLUSIONS = ["success", "failure", "neutral", "cancelled", "timed_out", "action_required"];
if (!VALID_CONCLUSIONS.includes(args.conclusion)) {
  console.error(`Invalid --conclusion "${args.conclusion}" — must be one of: ${VALID_CONCLUSIONS.join(", ")}`);
  process.exit(1);
}

const res = await fetch(`https://api.github.com/repos/${args.owner}/${args.repo}/check-runs`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: args["check-name"],
    head_sha: args.sha,
    status: "completed",
    conclusion: args.conclusion,
    details_url: args["details-url"] || undefined,
    output: {
      title: args["check-name"],
      summary: `Relayed from CIG git-ci fallback (ci.cig.technology) — GitHub Actions was unavailable when this check ran.`,
    },
  }),
});

const body = await res.json();
if (!res.ok) {
  console.error(`Failed to post check-run (${res.status}):`, body);
  process.exit(1);
}

console.log(`✓ Posted check-run "${args["check-name"]}" (${args.conclusion}) to ${args.owner}/${args.repo}@${args.sha.slice(0, 7)}`);
