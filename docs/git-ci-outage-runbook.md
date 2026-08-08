# Git/CI Fallback Outage Runbook

**Status:** draft — infrastructure code written, not yet deployed
**Audience:** CIG operators
**Service:** `packages/git-ci`, `packages/iac/modules/git-ci-aws/`
**Related:** `.agents/pending-tasks/git-ci-fallback/task.md`, `docs/deployment/minimal-infrastructure.md`

This runbook covers operating the multi-tenant Forgejo CI fallback
(`ci.cig.technology`) during a real GitHub platform outage, and the manual
fallback for tenants not yet onboarded. It complements, and does not
override, the safety rules in `docs/deployment/minimal-infrastructure.md` —
in particular: **do not run a blanket `terraform apply` in `lean-prod`**
until the module has been reviewed and applied deliberately.

## 1. Confirm it's actually a GitHub outage

Before doing anything, rule out a tenant-specific problem (bad workflow
file, expired token, branch protection misconfiguration):

1. Check `https://www.githubstatus.com/api/v2/summary.json` — look for an
   active incident affecting "Actions" or "Webhooks".
2. Confirm the symptom matches a platform outage, not a single repo issue:
   PR checks never start (no queued run at all, not a failed run), or
   `gh workflow run` / webhook dispatches return `5xx`.
3. If GitHub itself is healthy, this is not a git-ci-fallback situation —
   debug the tenant's own GitHub Actions config instead.

## 2. Confirm a tenant's push-mirror is current

Each onboarded tenant's GitHub repo push-mirrors to
`https://ci.cig.technology/<tenant-slug>/<repo>`. To confirm the mirror
picked up the latest commit:

```bash
git ls-remote https://ci.cig.technology/<tenant-slug>/<repo>.git HEAD
```

Compare the commit SHA against the tenant's GitHub `HEAD`. Push-mirrors are
event-driven (GitHub's native "Push mirror" repo setting) — if the SHAs
don't match within a couple of minutes of a push, the mirror itself is the
problem, not GitHub's outage; check the mirror configuration before
escalating further.

## 3. Start the runner for a dry-run or a real outage

The runner EC2 is provisioned **stopped** by default (see
`packages/iac/modules/git-ci-aws/runner.tf`) — it costs nothing while idle
and there is no auto-start-on-push wiring in this lean v1 (see
"Deferred / out of scope" below). Start it manually:

```bash
pnpm git-ci:runner:start
```

It registers itself against `ci.cig.technology` on first boot and then
picks up queued jobs on any onboarded tenant's mirrored repo. It self-stops
after 15 idle minutes with no running job — no manual stop is required
after a dry-run, but `pnpm git-ci:runner:stop` is available to force it.

## 4. Verify relayed checks land on the tenant's GitHub repo

Once the runner picks up a job, its final step calls
`scripts/relay-check-to-github.mjs`, which posts a named check-run to the
tenant's **own** GitHub repo via the Checks API, using that tenant's
own-repo-scoped `FORGEJO_RELAY_TOKEN`. Confirm on the tenant's GitHub PR
that the expected check names (matching what their branch-protection rules
require) appear and reach a `completed`/`success` conclusion. If they do,
the tenant can `gh pr merge` normally without an `--admin` bypass, even
while GitHub Actions itself is still down.

## 5. Manual fallback for tenants not yet onboarded

A tenant with no Forgejo org yet has no independent CI path during a
GitHub outage. Their only option is a manual, audited bypass on their own
repo:

```bash
gh pr merge <PR> --admin --merge
```

This should only be used by someone with the authority to bypass that
tenant's branch protection, with a follow-up comment on the PR noting the
GitHub outage as the reason (for audit trail). Onboarding the tenant
(`pnpm git-ci:provision:tenant`) removes the need for this going forward.

## Deferred / out of scope (documented, not built)

These are intentionally not part of this lean v1, per
`.agents/pending-tasks/git-ci-fallback/task.md` Phase 4:

- **Auto-start-on-push for the runner.** Starting the runner automatically
  when a mirrored push lands would require a public webhook receiver —
  more always-on infra, which cuts against the "lean, mostly-idle between
  real outages" design point. v1 requires a CIG operator to run
  `pnpm git-ci:runner:start` manually for a dry-run or a real incident.
- **Full pipeline mirroring** (porting a tenant's mobile/infra-deploy
  release workflows beyond the default secret-scan/coverage/Semgrep
  triad) is a per-tenant premium add-on, not part of default onboarding.
- **Dedicated per-tenant runners** (isolation upsell beyond the shared
  on-demand runner pool) — deferred until there's real demand.
- **CodeQL-equivalent gap:** the default Semgrep OSS check is not a
  full CodeQL replacement (CodeQL itself is GitHub-proprietary and
  unavailable off-platform) — accepted as a known gap.

## Testing / operational cadence — not yet started

Live dry-run failover testing (simulate an outage, confirm a real
`gh pr merge` succeeds on Hashpass's repo via relayed checks), onboarding
a second real tenant to validate multi-tenant isolation, and adding a
quarterly dry-run to CIG's ops calendar are all Phase 5 items in
`task.md`. They require the infrastructure in
`packages/iac/modules/git-ci-aws/` to actually be deployed first — this
runbook will be updated with verified steps once that happens.

## Source of truth

- Design spec: `.agents/pending-tasks/git-ci-fallback/task.md`
- Terraform module: `packages/iac/modules/git-ci-aws/`
- Package scripts and workflow templates: `packages/git-ci/`
- AWS account guard: `520900722378`, region `us-east-2` — every mutating
  script in `packages/git-ci/scripts/` verifies this via
  `aws sts get-caller-identity` before acting, matching
  `packages/monitor-ui/scripts/patch-env.mjs`'s pattern.
