## [1.0.8](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v1.0.6...v1.0.8) (2026-07-02)


### Features

* **iac:** provision standalone infisical secrets manager ([0650633](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/06506337608f2f5bbd104a0384bb7cae4bb13583))





## [1.0.8](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v1.0.6...v1.0.8) (2026-07-02)


### Features

* **iac:** provision standalone infisical secrets manager ([0650633](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/06506337608f2f5bbd104a0384bb7cae4bb13583))





## [1.0.7](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v1.0.6...v1.0.7) (2026-07-02)


### Features

* **iac:** provision standalone infisical secrets manager ([0650633](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/06506337608f2f5bbd104a0384bb7cae4bb13583))





## [1.0.6](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v1.0.5...v1.0.6) (2026-07-01)


### Bug Fixes

* **auth:** redirect to dashboard after email OTP verification ([7d5e31c](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/7d5e31cd66d6bc27107e79bef5aac716a189f50a))





## [1.0.6](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v1.0.5...v1.0.6) (2026-07-01)


### Bug Fixes

* **auth:** redirect to dashboard after email OTP verification ([7d5e31c](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/7d5e31cd66d6bc27107e79bef5aac716a189f50a))





## [1.0.5](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v1.0.4...v1.0.5) (2026-07-01)


### Bug Fixes

* update all repo references from edwardcalderon to CIG-TECHNOLOGY ([c5913e8](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/c5913e8e82b0da2c93608b215bf4550808ec5b92))





## [1.0.5](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v1.0.4...v1.0.5) (2026-07-01)


### Bug Fixes

* update all repo references from edwardcalderon to CIG-TECHNOLOGY ([c5913e8](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/c5913e8e82b0da2c93608b215bf4550808ec5b92))





## [1.0.4](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v1.0.3...v1.0.4) (2026-07-01)


### Bug Fixes

* **dashboard:** replace sun icon with gear icon in header settings button ([21c06ed](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/21c06ede2ac8b7679cf7575082430d18d992a21d))





## [1.0.4](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v1.0.3...v1.0.4) (2026-07-01)


### Bug Fixes

* **dashboard:** replace sun icon with gear icon in header settings button ([21c06ed](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/21c06ede2ac8b7679cf7575082430d18d992a21d))





## [1.0.3](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v1.0.2...v1.0.3) (2026-07-01)


### Bug Fixes

* **release:** push to both remotes and fix stale Dockerfile path in release.sh ([f271582](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/f27158251ea4ca8c04a61a92fb863d237c37364d))





## [1.0.3](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v1.0.2...v1.0.3) (2026-07-01)


### Bug Fixes

* **release:** push to both remotes and fix stale Dockerfile path in release.sh ([f271582](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/f27158251ea4ca8c04a61a92fb863d237c37364d))





## [1.0.2](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v1.0.1...v1.0.2) (2026-07-01)

### Bug Fixes

* add `https://app.cig.lat` to production CORS origins — dashboard OTP and verify-otp flows were blocked by missing `Access-Control-Allow-Origin` header ([packages/api/src/cors.ts](packages/api/src/cors.ts))
* add `GET /api/v1/health/db` endpoint (`SELECT 1` probe, returns 200/503) to provide an external DB connectivity check independent of the heartbeat monitor

### Chores

* add `.github/workflows/keep-alive.yml` — scheduled every 3 days to ping `/api/v1/health` and `/api/v1/health/db`; emits workflow error if DB is unreachable so Supabase free-tier pause is caught before users report it


## [1.0.1](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v1.0.0...v1.0.1) (2026-07-01)

### Bug Fixes

* set Authentik brand default application to `cig-dashboard` via SQL in the host provisioning script ([user_data.sh.tftpl](packages/iac/modules/authentik-host/user_data.sh.tftpl))
* document account-guard check in migrate-cig-account.mjs

### Chores

* add `CLAUDE.md` — project conventions for Claude Code, including the two-remote push policy
* add `TODO` to `.gitignore`
* move `UPGRADE_SUMMARY.md` and `VERSIONING_GUIDE.md` from repo root into `docs/`
* update docs primary domain note in `apps/docs/IMPLEMENTATION_STATUS.md`


## [1.0.0](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.3.11...v1.0.0) (2026-07-01)

First stable release of Compute Intelligence Graph. The production API is live at `https://api.cig.technology`, the full GitHub Actions CI/CD pipeline is operational, Authentik SSO is wired end-to-end, and the repository has migrated to the CIG-TECHNOLOGY GitHub organisation.

### Features

* production API live at `https://api.cig.technology` — ECS/Fargate behind public ALB, Route 53, and ACM
* full GitHub Actions CI/CD pipeline: detect → validate → build → migrate → deploy → smoke-test
* Authentik OIDC SSO with PKCE — social login (Google, GitHub) fully wired through dashboard relay and login-callback bridge
* email OTP authentication path with SMTP via nodemailer; troubleshooting runbook added to deployment docs
* Authentik client ID error path documented end-to-end with CI guard, wrong-fallback incident, and drift-check list

### Bug Fixes

* reuse existing ECR repository instead of creating a duplicate ([db590ce](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/db590ce))
* fix API core-data Terraform job gating ([69b049e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/69b049e), [0489778](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/0489778))
* fix Authentik secret lookup to use correct AWS Secrets Manager path ([8a1ba39](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/8a1ba39))
* restore github-actions-role ECS/ECR/ELB permissions in prod account 520900722378 ([e80f4d5](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/e80f4d5))
* fix Authentik client ID default fallback (`G4D6S7WX…` → `cig-dashboard`) and add account guard ([d4aea56](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/d4aea56))
* fix API deploy recovery path and workflow app name ([899f282](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/899f282), [99ca728](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/99ca728))

### Chores

* move container build definitions from `infra/docker/` to `packages/infra/docker/` — all workflow, compose, and doc references updated ([fbed0ed](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/fbed0ed))
* migrate canonical repository to `CIG-TECHNOLOGY/ComputeIntelligenceGraph` — 43 files updated across source, workflows, Terraform, docs, and scripts ([c6aaf35](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/c6aaf35))


## [0.3.11](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.3.5...v0.3.11) (2026-05-02)


### Bug Fixes

* add concurrent build limits to CodeBuild projects and update pipeline documentation ([2d192b1](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/2d192b19d75550cd15a265ee706ed6b92f09dbf4))
* clean node_modules before pnpm install in CodeBuild to avoid EISDIR errors ([c5ce5d6](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/c5ce5d6b39d58a3ef740fcb31e5138d671161752))
* deploy stage uses SourceOutput for full repo + BuildOutput for image URI ([6a89253](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/6a892533aa18eda275f3dbc5ea3d26338f3db3d9))
* enforce AWS_PROFILE in SST config and redeploy pipelines to CIG account (520900722378) ([0e47035](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/0e470351e7ccf3940aaa28fab5ae2c7c4fad38e9))
* fix CodeBuild buildspec YAML errors and add AWS account guardrails ([75db725](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/75db725536c55031c78404e86579d28cf90ac737))
* remove Route 53 DNS management from Pulumi (already managed separately) ([179e68d](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/179e68d60c0d8261f38503a0173f2d267a19cff4))
* remove Validate stage from pipeline to work around CodeBuild quota issue ([b4c18ce](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/b4c18cedbdd02ef65749ec69fdca6a4e84852376))
* use --no-frozen-lockfile in all CodeBuild buildspecs ([ea078ea](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/ea078ea730cef6d1a3374836c910332f2309603c))
* use --no-frozen-lockfile in Dockerfile and update lockfile ([4dbed38](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/4dbed381885728df1adc874d8f3e16ac9770f471))
* use filtered pnpm install in buildspecs to avoid monorepo conflicts ([113405c](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/113405caf4459080060adadf0b7d27ca20510852))


### Features

* add proper SST infrastructure configuration for LLM Proxy using Pulumi ([cdd4270](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/cdd4270ff3a39ebd2c92693889abe5c2db4d79dd))
* replace CodePipeline with GitHub Actions for CI/CD (workaround for CodeBuild quota issue) ([be62240](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/be62240b6250163e91ac2c7935d87ad1f914f2e5))





## [0.3.11](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.3.5...v0.3.11) (2026-05-02)


### Bug Fixes

* add concurrent build limits to CodeBuild projects and update pipeline documentation ([2d192b1](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/2d192b19d75550cd15a265ee706ed6b92f09dbf4))
* clean node_modules before pnpm install in CodeBuild to avoid EISDIR errors ([c5ce5d6](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/c5ce5d6b39d58a3ef740fcb31e5138d671161752))
* deploy stage uses SourceOutput for full repo + BuildOutput for image URI ([6a89253](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/6a892533aa18eda275f3dbc5ea3d26338f3db3d9))
* enforce AWS_PROFILE in SST config and redeploy pipelines to CIG account (520900722378) ([0e47035](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/0e470351e7ccf3940aaa28fab5ae2c7c4fad38e9))
* fix CodeBuild buildspec YAML errors and add AWS account guardrails ([75db725](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/75db725536c55031c78404e86579d28cf90ac737))
* remove Route 53 DNS management from Pulumi (already managed separately) ([179e68d](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/179e68d60c0d8261f38503a0173f2d267a19cff4))
* remove Validate stage from pipeline to work around CodeBuild quota issue ([b4c18ce](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/b4c18cedbdd02ef65749ec69fdca6a4e84852376))
* use --no-frozen-lockfile in all CodeBuild buildspecs ([ea078ea](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/ea078ea730cef6d1a3374836c910332f2309603c))
* use --no-frozen-lockfile in Dockerfile and update lockfile ([4dbed38](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/4dbed381885728df1adc874d8f3e16ac9770f471))
* use filtered pnpm install in buildspecs to avoid monorepo conflicts ([113405c](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/113405caf4459080060adadf0b7d27ca20510852))


### Features

* add proper SST infrastructure configuration for LLM Proxy using Pulumi ([cdd4270](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/cdd4270ff3a39ebd2c92693889abe5c2db4d79dd))
* replace CodePipeline with GitHub Actions for CI/CD (workaround for CodeBuild quota issue) ([be62240](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/be62240b6250163e91ac2c7935d87ad1f914f2e5))





## [0.3.10](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.3.5...v0.3.10) (2026-05-02)


### Bug Fixes

* add concurrent build limits to CodeBuild projects and update pipeline documentation ([2d192b1](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/2d192b19d75550cd15a265ee706ed6b92f09dbf4))
* clean node_modules before pnpm install in CodeBuild to avoid EISDIR errors ([c5ce5d6](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/c5ce5d6b39d58a3ef740fcb31e5138d671161752))
* deploy stage uses SourceOutput for full repo + BuildOutput for image URI ([6a89253](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/6a892533aa18eda275f3dbc5ea3d26338f3db3d9))
* enforce AWS_PROFILE in SST config and redeploy pipelines to CIG account (520900722378) ([0e47035](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/0e470351e7ccf3940aaa28fab5ae2c7c4fad38e9))
* fix CodeBuild buildspec YAML errors and add AWS account guardrails ([75db725](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/75db725536c55031c78404e86579d28cf90ac737))
* remove Route 53 DNS management from Pulumi (already managed separately) ([179e68d](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/179e68d60c0d8261f38503a0173f2d267a19cff4))
* remove Validate stage from pipeline to work around CodeBuild quota issue ([b4c18ce](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/b4c18cedbdd02ef65749ec69fdca6a4e84852376))
* use --no-frozen-lockfile in all CodeBuild buildspecs ([ea078ea](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/ea078ea730cef6d1a3374836c910332f2309603c))
* use --no-frozen-lockfile in Dockerfile and update lockfile ([4dbed38](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/4dbed381885728df1adc874d8f3e16ac9770f471))
* use filtered pnpm install in buildspecs to avoid monorepo conflicts ([113405c](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/113405caf4459080060adadf0b7d27ca20510852))


### Features

* add proper SST infrastructure configuration for LLM Proxy using Pulumi ([cdd4270](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/cdd4270ff3a39ebd2c92693889abe5c2db4d79dd))
* replace CodePipeline with GitHub Actions for CI/CD (workaround for CodeBuild quota issue) ([be62240](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/be62240b6250163e91ac2c7935d87ad1f914f2e5))





## [0.3.10](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.3.5...v0.3.10) (2026-05-02)


### Bug Fixes

* add concurrent build limits to CodeBuild projects and update pipeline documentation ([2d192b1](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/2d192b19d75550cd15a265ee706ed6b92f09dbf4))
* clean node_modules before pnpm install in CodeBuild to avoid EISDIR errors ([c5ce5d6](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/c5ce5d6b39d58a3ef740fcb31e5138d671161752))
* deploy stage uses SourceOutput for full repo + BuildOutput for image URI ([6a89253](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/6a892533aa18eda275f3dbc5ea3d26338f3db3d9))
* enforce AWS_PROFILE in SST config and redeploy pipelines to CIG account (520900722378) ([0e47035](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/0e470351e7ccf3940aaa28fab5ae2c7c4fad38e9))
* fix CodeBuild buildspec YAML errors and add AWS account guardrails ([75db725](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/75db725536c55031c78404e86579d28cf90ac737))
* remove Route 53 DNS management from Pulumi (already managed separately) ([179e68d](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/179e68d60c0d8261f38503a0173f2d267a19cff4))
* remove Validate stage from pipeline to work around CodeBuild quota issue ([b4c18ce](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/b4c18cedbdd02ef65749ec69fdca6a4e84852376))
* use --no-frozen-lockfile in all CodeBuild buildspecs ([ea078ea](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/ea078ea730cef6d1a3374836c910332f2309603c))
* use --no-frozen-lockfile in Dockerfile and update lockfile ([4dbed38](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/4dbed381885728df1adc874d8f3e16ac9770f471))
* use filtered pnpm install in buildspecs to avoid monorepo conflicts ([113405c](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/113405caf4459080060adadf0b7d27ca20510852))


### Features

* add proper SST infrastructure configuration for LLM Proxy using Pulumi ([cdd4270](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/cdd4270ff3a39ebd2c92693889abe5c2db4d79dd))
* replace CodePipeline with GitHub Actions for CI/CD (workaround for CodeBuild quota issue) ([be62240](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/be62240b6250163e91ac2c7935d87ad1f914f2e5))





## [0.3.9](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.3.8...v0.3.9) (2026-04-28)

### Detected changes
- .github: .github/workflows/deploy-pages.yml


## [0.3.9](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.3.8...v0.3.9) (2026-04-28)





## [0.3.8](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.3.7...v0.3.8) (2026-04-28)

### Detected changes
- .github: 2 changed file(s)
  - .github/workflows/deploy-dashboard.yml
  - .github/workflows/publish-images.yml
- root: 3 changed file(s)
  - CHANGELOG.md
  - package.json
  - release-metadata.json
- apps: 10 changed file(s)
  - apps/dashboard/app/auth/callback/page.tsx
  - apps/dashboard/app/auth/login-callback/route.ts
  - apps/dashboard/components/ChatWidget.tsx
  - apps/dashboard/next.config.js
  - apps/dashboard/package.json
  - apps/docs/package.json
  - apps/landing/components/AuthButton.tsx
  - apps/landing/next.config.js
  - apps/landing/package.json
  - apps/wizard-ui/package.json
- packages: 8 changed file(s)
  - packages/agents/package.json
  - packages/api/package.json
  - packages/auth/README.md
  - packages/chatbot/package.json
  - packages/config/package.json
  - packages/discovery/package.json
  - packages/graph/package.json
  - packages/sdk/package.json
- scripts: scripts/release.sh


## [0.3.8](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.3.5...v0.3.8) (2026-04-28)





## [0.3.7](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.3.5...v0.3.7) (2026-04-28)





## [0.3.6](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.3.5...v0.3.6) (2026-04-28)





## [0.3.5](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.3.4...v0.3.5) (2026-04-05)

### Detected changes
- No source changes were detected; this release only advances version metadata.


## [0.3.5](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.3.4...v0.3.5) (2026-04-05)





## [0.3.4](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.3.3...v0.3.4) (2026-03-30)

### Detected changes
- packages: 3 changed file(s)
  - packages/api/src/auth.ts
  - packages/api/src/bootstrap/request-context.ts
  - packages/api/src/security-testing.test.ts


## [0.3.4](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.3.3...v0.3.4) (2026-03-30)





## [0.3.3](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.3.2...v0.3.3) (2026-03-29)

### Detected changes
- packages: 3 changed file(s)
  - packages/api/src/routes/demo.test.ts
  - packages/api/src/routes/demo.ts
  - packages/api/src/security-testing.test.ts


## [0.3.3](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.3.2...v0.3.3) (2026-03-29)





## [0.3.2](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.3.1...v0.3.2) (2026-03-29)

### Detected changes
- packages: 2 changed file(s)
  - packages/cli/src/__tests__/install-env.test.ts
  - packages/cli/src/commands/install.ts


## [0.3.2](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.3.1...v0.3.2) (2026-03-29)





## [0.3.1](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.3.0...v0.3.1) (2026-03-29)

### Detected changes
- packages: 5 changed file(s)
  - packages/api/src/__tests__/bootstrap-node.test.ts
  - packages/api/src/__tests__/bootstrap.test.ts
  - packages/api/src/bootstrap/request-context.ts
  - packages/api/src/routes/bootstrap-node.ts
  - packages/api/src/routes/bootstrap.ts


## [0.3.1](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.3.0...v0.3.1) (2026-03-29)





# [0.3.0](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.102...v0.3.0) (2026-03-29)





# [0.3.0](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.102...v0.3.0) (2026-03-29)





## [0.2.102](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.101...v0.2.102) (2026-03-29)

### Detected changes
- packages: 3 changed file(s)
  - packages/graph/src/engine.test.ts
  - packages/graph/src/queries.ts
  - packages/graph/src/transitive-deps.property.test.ts


## [0.2.102](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.101...v0.2.102) (2026-03-29)





## [0.2.101](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.100...v0.2.101) (2026-03-29)

### Detected changes
- packages: 3 changed file(s)
  - packages/api/src/db/migrate.test.ts
  - packages/api/src/db/migrate.ts
  - packages/api/src/db/migrations/008_managed_nodes_updated_at.sql


## [0.2.101](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.100...v0.2.101) (2026-03-29)





## [0.2.100](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.99...v0.2.100) (2026-03-29)

### Detected changes
- packages: 5 changed file(s)
  - packages/api/src/db/client.ts
  - packages/api/src/db/migrate.test.ts
  - packages/api/src/db/migrate.ts
  - packages/api/src/db/migrations/004_cig_node_onboarding.sql
  - packages/api/src/db/schema.ts


## [0.2.100](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.99...v0.2.100) (2026-03-29)





## [0.2.99](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.98...v0.2.99) (2026-03-28)

### Detected changes
- infra: infra/docker/Dockerfile.api
- packages: 4 changed file(s)
  - packages/cli/src/commands/install.ts
  - packages/cli/src/commands/uninstall.ts
  - packages/infra/src/__tests__/compose.test.ts
  - packages/infra/src/compose.ts


## [0.2.99](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.98...v0.2.99) (2026-03-28)





## [0.2.98](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.97...v0.2.98) (2026-03-28)

### Detected changes
- packages: 5 changed file(s)
  - packages/api/src/db/client.test.ts
  - packages/api/src/db/client.ts
  - packages/cli/src/commands/install.ts
  - packages/infra/src/__tests__/compose.test.ts
  - packages/infra/src/compose.ts


## [0.2.98](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.97...v0.2.98) (2026-03-28)





## [0.2.97](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.96...v0.2.97) (2026-03-28)

### Detected changes
- No source changes were detected; this release only advances version metadata.


## [0.2.97](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.96...v0.2.97) (2026-03-28)





## [0.2.96](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.95...v0.2.96) (2026-03-28)


### Bug Fixes

* **self-hosted:** allow localhost dashboard CORS ([f12e083](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/f12e083729e9eb4348bef4274b8950531447b6c5))





## [0.2.96](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.95...v0.2.96) (2026-03-28)


### Bug Fixes

* **self-hosted:** allow localhost dashboard CORS ([f12e083](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/f12e083729e9eb4348bef4274b8950531447b6c5))





## [0.2.95](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.94...v0.2.95) (2026-03-28)

### Detected changes
- apps: 5 changed file(s)
  - apps/dashboard/app/bootstrap/page.tsx
  - apps/dashboard/components/ChatWidget.tsx
  - apps/dashboard/lib/__tests__/cigClient.test.ts
  - apps/dashboard/lib/authProvider.ts
  - apps/dashboard/lib/cigClient.ts
- packages: 8 changed file(s)
  - packages/agents/src/openclaw.ts
  - packages/cli/src/command-classes.ts
  - packages/cli/src/commands/install.ts
  - packages/cli/src/commands/setup.test.ts
  - packages/cli/src/commands/setup.ts
  - packages/cli/src/index.ts
  - packages/infra/src/__tests__/compose.test.ts
  - packages/infra/src/compose.ts


## [0.2.95](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.94...v0.2.95) (2026-03-28)





## [0.2.94](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.93...v0.2.94) (2026-03-28)

### Detected changes
- root: CHANGELOG.md
- apps: apps/dashboard/components/ChatWidget.tsx
- packages: 18 changed file(s)
  - packages/agents/src/openclaw.ts
  - packages/api/src/__tests__/startup.test.ts
  - packages/api/src/chat-inputs.ts
  - packages/api/src/chat.ts
  - packages/api/src/db/client.test.ts
  - packages/api/src/db/client.ts
  - packages/api/src/index.ts
  - packages/api/src/semantic-rag.test.ts
  - packages/api/src/semantic-rag.ts
  - packages/chatbot/src/index.ts
  - packages/chatbot/src/inference.test.ts
  - packages/chatbot/src/inference.ts
  - packages/chatbot/src/rag.ts
  - packages/cli/src/commands/install.ts
  - packages/cli/src/ssh.ts
  - packages/infra/src/__tests__/compose.test.ts
  - packages/infra/src/compose.ts
  - packages/sdk/src/types.ts


## [0.2.94](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.93...v0.2.94) (2026-03-28)







## [0.2.93](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.92...v0.2.93) (2026-03-28)


### Bug Fixes

* **ci:** sync README before version:validate in publish-cli workflow ([4d04fc7](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/4d04fc7b589f91814ddcd4b323ea047174b6c61e))
* **cli:** use self-hosted dashboard image so API calls hit localhost not production ([8a1ef44](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/8a1ef449596c01cbdb3cfc53a0e3a32a92eacf04))





## [0.2.93](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.92...v0.2.93) (2026-03-28)


### Bug Fixes

* **ci:** sync README before version:validate in publish-cli workflow ([4d04fc7](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/4d04fc7b589f91814ddcd4b323ea047174b6c61e))
* **cli:** use self-hosted dashboard image so API calls hit localhost not production ([8a1ef44](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/8a1ef449596c01cbdb3cfc53a0e3a32a92eacf04))





## [0.2.92](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.91...v0.2.92) (2026-03-28)

### Detected changes
- apps: 3 changed file(s)
  - apps/landing/app/install/InstallContent.tsx
  - apps/landing/app/install/page.tsx
  - apps/landing/lib/publishedCli.ts
- packages: 5 changed file(s)
  - packages/i18n/catalogs/landing/en.json
  - packages/i18n/catalogs/landing/es.json
  - packages/i18n/catalogs/landing/zh.json
  - packages/i18n/src/locales/keys.ts
  - packages/i18n/src/locales/landing.ts


## [0.2.92](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.91...v0.2.92) (2026-03-28)





## [0.2.91](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.90...v0.2.91) (2026-03-28)


### Bug Fixes

* **cli:** fix demo data prompt and wiring ([dcbda56](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/dcbda568f2a1e9c832949b21fed4c9dfccea14f2))





## [0.2.91](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.90...v0.2.91) (2026-03-28)


### Bug Fixes

* **cli:** fix demo data prompt and wiring ([dcbda56](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/dcbda568f2a1e9c832949b21fed4c9dfccea14f2))





## [0.2.90](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.89...v0.2.90) (2026-03-27)


### Bug Fixes

* **cli:** poll correct health endpoint after install ([8733bda](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/8733bda91c275e109ce36a5d430fea501e43abc0))
* **cli:** use correct Docker Hub images instead of non-existent ghcr.io/cig/ ([5be74a2](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/5be74a2d582f8d821d1823c86fd4a776f6b9a5c5))





## [0.2.90](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.89...v0.2.90) (2026-03-27)


### Bug Fixes

* **cli:** poll correct health endpoint after install ([8733bda](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/8733bda91c275e109ce36a5d430fea501e43abc0))
* **cli:** use correct Docker Hub images instead of non-existent ghcr.io/cig/ ([5be74a2](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/5be74a2d582f8d821d1823c86fd4a776f6b9a5c5))





## [0.2.89](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.88...v0.2.89) (2026-03-27)

### Detected changes
- .github: .github/workflows/deploy-pages.yml


## [0.2.89](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.88...v0.2.89) (2026-03-27)





## [0.2.88](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.87...v0.2.88) (2026-03-27)


### Bug Fixes

* **cli:** fix default api-url port and skip network check on self-hosted install ([ebd1782](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/ebd17824ec856b4020a347727cac20bae1b50718))
* **cli:** register setup command and add e2e smoke test in CI ([74f17f7](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/74f17f75f55de37f05b60224586560b633d3681f))
* **cli:** remove stale @cig/sdk from lockfile ([828d433](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/828d43345085574df66b1cc142fbecb6043be8df))
* **cli:** use user-writable install dir instead of /opt/cig-node ([186bdda](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/186bddaed2b0229c8577fa687d9fe8360c3e184d))





## [0.2.88](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.87...v0.2.88) (2026-03-27)


### Bug Fixes

* **cli:** fix default api-url port and skip network check on self-hosted install ([ebd1782](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/ebd17824ec856b4020a347727cac20bae1b50718))
* **cli:** register setup command and add e2e smoke test in CI ([74f17f7](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/74f17f75f55de37f05b60224586560b633d3681f))
* **cli:** remove stale @cig/sdk from lockfile ([828d433](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/828d43345085574df66b1cc142fbecb6043be8df))
* **cli:** use user-writable install dir instead of /opt/cig-node ([186bdda](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/186bddaed2b0229c8577fa687d9fe8360c3e184d))





## [0.2.87](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.86...v0.2.87) (2026-03-27)

### Detected changes
- apps: 2 changed file(s)
  - apps/dashboard/app/(dashboard)/graph/page.tsx
  - apps/dashboard/components/Graph3DCanvas.tsx
- infra: infra/docker/Dockerfile.api


## [0.2.87](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.86...v0.2.87) (2026-03-27)





## [0.2.86](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.85...v0.2.86) (2026-03-27)

### Detected changes
- packages: 2 changed file(s)
  - packages/api/src/__tests__/startup.test.ts
  - packages/api/src/index.ts


## [0.2.86](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.85...v0.2.86) (2026-03-27)





## [0.2.85](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.84...v0.2.85) (2026-03-27)


### Bug Fixes

* **ci:** harden pages deploy and sdk entry ([11a0df1](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/11a0df1d1d9f89c0f52ce31d34940d79cecac3cd))





## [0.2.85](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.84...v0.2.85) (2026-03-27)


### Bug Fixes

* **ci:** harden pages deploy and sdk entry ([11a0df1](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/11a0df1d1d9f89c0f52ce31d34940d79cecac3cd))





## [0.2.84](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.83...v0.2.84) (2026-03-27)

### Detected changes
- No source changes were detected; this release only advances version metadata.


## [0.2.84](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.83...v0.2.84) (2026-03-27)





## [0.2.83](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.82...v0.2.83) (2026-03-27)

### Detected changes
- packages: packages/sdk/src/client.ts


## [0.2.83](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.82...v0.2.83) (2026-03-27)





## [0.2.82](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.81...v0.2.82) (2026-03-27)

### Detected changes
- apps: 4 changed file(s)
  - apps/docs/docs/en/architecture/components.md
  - apps/docs/docs/en/architecture/index.md
  - apps/docs/docs/en/getting-started/installation.md
  - apps/docs/sidebars.ts


## [0.2.82](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.81...v0.2.82) (2026-03-27)





## [0.2.81](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.80...v0.2.81) (2026-03-27)

### Detected changes
- packages: packages/chatbot/src/chatbot.test.ts


## [0.2.81](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.80...v0.2.81) (2026-03-27)





## [0.2.80](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.79...v0.2.80) (2026-03-27)

### Detected changes
- apps: 6 changed file(s)
  - apps/dashboard/components/ChatExamplesTab.tsx
  - apps/dashboard/components/ChatWidget.tsx
  - apps/dashboard/components/__tests__/ChatWidget.test.tsx
  - apps/dashboard/lib/__tests__/api.test.ts
  - apps/dashboard/lib/api.ts
  - apps/landing/components/AuthProvider.tsx
- packages: 14 changed file(s)
  - packages/api/src/__tests__/chat.test.ts
  - packages/api/src/chat-context.ts
  - packages/api/src/chat-store.ts
  - packages/api/src/chat-template-response.ts
  - packages/api/src/chat.ts
  - packages/api/src/demo-workspace.ts
  - packages/api/src/routes.ts
  - packages/api/src/routes/chat.ts
  - packages/api/src/routes/demo.test.ts
  - packages/api/src/routes/demo.ts
  - packages/sdk/package.json
  - packages/sdk/src/client.test.ts
  - packages/sdk/src/client.ts
  - packages/sdk/src/types.ts


## [0.2.80](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.79...v0.2.80) (2026-03-27)





## [0.2.79](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.78...v0.2.79) (2026-03-27)

### Detected changes
- apps: 3 changed file(s)
  - apps/dashboard/components/Graph3DCanvas.tsx
  - apps/dashboard/package.json
  - apps/dashboard/types/react-force-graph-3d.d.ts
- packages: 3 changed file(s)
  - packages/agents/src/openclaw.ts
  - packages/api/src/__tests__/chat.test.ts
  - packages/api/src/chat.ts
- root: pnpm-lock.yaml


## [0.2.79](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.78...v0.2.79) (2026-03-27)





## [0.2.78](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.77...v0.2.78) (2026-03-27)

### Detected changes
- apps: 5 changed file(s)
  - apps/dashboard/app/(dashboard)/graph/page.tsx
  - apps/dashboard/components/ChatLinkPickerDialog.tsx
  - apps/dashboard/components/ChatWidget.tsx
  - apps/dashboard/components/__tests__/ChatWidget.test.tsx
  - apps/dashboard/lib/api.ts
- packages: 9 changed file(s)
  - packages/api/src/demo-workspace.test.ts
  - packages/api/src/demo-workspace.ts
  - packages/api/src/integration.test.ts
  - packages/api/src/performance.test.ts
  - packages/api/src/routes/chat.ts
  - packages/api/src/routes/graph.ts
  - packages/api/src/security-testing.test.ts
  - packages/sdk/src/client.ts
  - packages/sdk/src/types.ts


## [0.2.78](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.77...v0.2.78) (2026-03-27)





## [0.2.77](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.76...v0.2.77) (2026-03-27)

### Detected changes
- apps: 3 changed file(s)
  - apps/dashboard/lib/__tests__/graphSource.test.ts
  - apps/dashboard/lib/graphSource.ts
  - apps/dashboard/lib/useGraphSource.ts
- packages: 10 changed file(s)
  - packages/api/src/db/migrations/006_demo_workspace_state.sql
  - packages/api/src/db/migrations/007_newsletter_unsubscribe.sql
  - packages/api/src/demo-workspace.test.ts
  - packages/api/src/demo-workspace.ts
  - packages/api/src/graph-scope.ts
  - packages/api/src/routes/demo.test.ts
  - packages/api/src/routes/demo.ts
  - packages/api/src/routes/graph.ts
  - packages/api/src/semantic-rag.ts
  - packages/sdk/src/types.ts


## [0.2.77](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.76...v0.2.77) (2026-03-27)





## [0.2.76](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.75...v0.2.76) (2026-03-27)

### Detected changes
- apps: 2 changed file(s)
  - apps/dashboard/components/NotificationBell.tsx
  - apps/dashboard/lib/systemNotifications.ts
- packages: 5 changed file(s)
  - packages/i18n/catalogs/dashboard/en.json
  - packages/i18n/catalogs/dashboard/es.json
  - packages/i18n/catalogs/dashboard/zh.json
  - packages/i18n/src/locales/dashboard.ts
  - packages/i18n/src/locales/keys.ts


## [0.2.76](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.75...v0.2.76) (2026-03-27)





## [0.2.75](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.74...v0.2.75) (2026-03-27)

### Detected changes
- packages: 3 changed file(s)
  - packages/api/src/semantic-rag.ts
  - packages/api/tsconfig.json
  - packages/chatbot/package.json


## [0.2.75](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.74...v0.2.75) (2026-03-27)





## [0.2.74](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.73...v0.2.74) (2026-03-27)

### Detected changes
- packages: packages/api/src/semantic-rag.ts


## [0.2.74](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.73...v0.2.74) (2026-03-27)





## [0.2.73](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.72...v0.2.73) (2026-03-27)

### Detected changes
- apps: 4 changed file(s)
  - apps/landing/.env.example
  - apps/landing/app/page.tsx
  - apps/landing/app/unsubscribe/page.tsx
  - apps/landing/next.config.js
- packages: 9 changed file(s)
  - packages/api/.env.example
  - packages/api/src/email-sender.ts
  - packages/api/src/newsletter.ts
  - packages/api/src/routes.ts
  - packages/i18n/catalogs/landing/en.json
  - packages/i18n/catalogs/landing/es.json
  - packages/i18n/catalogs/landing/zh.json
  - packages/i18n/src/locales/keys.ts
  - packages/i18n/src/locales/landing.ts
- supabase: supabase/migrations/20260327_001_newsletter_unsubscribe.sql


## [0.2.73](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.72...v0.2.73) (2026-03-27)





## [0.2.72](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.71...v0.2.72) (2026-03-27)

### Detected changes
- packages: packages/chatbot/package.json


## [0.2.72](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.71...v0.2.72) (2026-03-27)





## [0.2.71](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.70...v0.2.71) (2026-03-27)

### Detected changes
- packages: 14 changed file(s)
  - packages/api/src/db/migrations/005_graph_tenancy.sql
  - packages/api/src/graph-scope.ts
  - packages/api/src/jobs/semantic-index-sync.ts
  - packages/api/src/managed-scope.ts
  - packages/api/src/routes/nodes/graphDelta.test.ts
  - packages/api/src/routes/nodes/graphDelta.ts
  - packages/api/src/semantic-rag.test.ts
  - packages/api/src/semantic-rag.ts
  - packages/chatbot/src/vectordb.ts
  - packages/graph/src/engine.ts
  - packages/graph/src/index.ts
  - packages/graph/src/queries.ts
  - packages/graph/src/scope.ts
  - packages/graph/src/types.ts


## [0.2.71](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.70...v0.2.71) (2026-03-27)





## [0.2.70](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.69...v0.2.70) (2026-03-27)

### Detected changes
- apps: 3 changed file(s)
  - apps/landing/components/AuthenticatedLanding.tsx
  - apps/landing/components/BackToTop.tsx
  - apps/landing/components/LandingLayout.tsx


## [0.2.70](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.69...v0.2.70) (2026-03-27)





## [0.2.69](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.68...v0.2.69) (2026-03-27)


### Features

* add CHROMA_URI to self-hosted API for internal vector db access ([a87bd82](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/a87bd82a8cc1f1ad84007c812cf36e74753c3358))
* implement demo mode with simulation provider and CLI --demo flag ([059411f](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/059411f70fc0d10a5c334efbd32bc60dd89d9d5d))





## [0.2.69](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.68...v0.2.69) (2026-03-27)


### Features

* add CHROMA_URI to self-hosted API for internal vector db access ([a87bd82](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/a87bd82a8cc1f1ad84007c812cf36e74753c3358))
* implement demo mode with simulation provider and CLI --demo flag ([059411f](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/059411f70fc0d10a5c334efbd32bc60dd89d9d5d))





## [0.2.68](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.67...v0.2.68) (2026-03-27)


### Bug Fixes

* **ci:** build workspace packages before api lint in deploy workflow ([5f80cd7](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/5f80cd724f30ea5ffa9497461bba10c2fdaa1557))
* **ci:** build workspace packages before lint to resolve @cig/sdk and @cig/graph types ([0d75473](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/0d75473fd54c17a47b11c5dd2f32c9f1f3fdd0ac))
* **ui:** bell toggle, session panel corner, hero animation on theme change ([9ff2ece](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/9ff2ecee2eca6f08fe0b8ba80566db856877b6da))





## [0.2.68](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.67...v0.2.68) (2026-03-27)


### Bug Fixes

* **ci:** build workspace packages before api lint in deploy workflow ([5f80cd7](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/5f80cd724f30ea5ffa9497461bba10c2fdaa1557))
* **ci:** build workspace packages before lint to resolve @cig/sdk and @cig/graph types ([0d75473](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/0d75473fd54c17a47b11c5dd2f32c9f1f3fdd0ac))
* **ui:** bell toggle, session panel corner, hero animation on theme change ([9ff2ece](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/9ff2ecee2eca6f08fe0b8ba80566db856877b6da))





## [0.2.67](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.66...v0.2.67) (2026-03-27)

### Detected changes
- root: 4 changed file(s)
  - CHANGELOG.md
  - package.json
  - pnpm-lock.yaml
  - release-metadata.json
- apps: 10 changed file(s)
  - apps/dashboard/app/(dashboard)/graph/page.tsx
  - apps/dashboard/components/Graph3DCanvas.tsx
  - apps/dashboard/lib/__tests__/cigClient.test.ts
  - apps/dashboard/lib/api.ts
  - apps/dashboard/lib/sessionAuth.ts
  - apps/dashboard/package.json
  - apps/dashboard/types/react-force-graph-3d.d.ts
  - apps/docs/package.json
  - apps/landing/package.json
  - apps/wizard-ui/package.json
- packages: 19 changed file(s)
  - packages/agents/package.json
  - packages/agents/src/index.ts
  - packages/agents/src/openclaw.test.ts
  - packages/agents/src/openclaw.ts
  - packages/api/package.json
  - packages/api/src/integration.test.ts
  - packages/api/src/routes.ts
  - packages/api/src/routes/graph.ts
  - packages/api/src/security-testing.test.ts
  - packages/chatbot/package.json
  - packages/config/package.json
  - packages/discovery/package.json
  - packages/graph/package.json
  - packages/graph/src/engine.test.ts
  - packages/graph/src/engine.ts
  - packages/graph/src/queries.ts
  - packages/sdk/package.json
  - packages/sdk/src/client.ts
  - packages/sdk/src/types.ts


## [0.2.67](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.65...v0.2.67) (2026-03-27)





## [0.2.66](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.65...v0.2.66) (2026-03-27)





## [0.2.65](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.64...v0.2.65) (2026-03-27)

### Detected changes
- No source changes were detected; this release only advances version metadata.


## [0.2.65](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.64...v0.2.65) (2026-03-27)





## [0.2.64](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.63...v0.2.64) (2026-03-27)

### Detected changes
- packages: 4 changed file(s)
  - packages/cli/src/commands/install.ts
  - packages/infra/src/compose.ts
  - packages/runtime-contracts/src/index.ts
  - packages/sdk/src/types.ts


## [0.2.64](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.63...v0.2.64) (2026-03-27)





## [0.2.63](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.62...v0.2.63) (2026-03-27)


### Bug Fixes

* **ui:** voice waveform, mobile session actions, landing dot pattern ([c4e0551](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/c4e05514155593119b8ef470b294909cc429f67c))





## [0.2.63](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.62...v0.2.63) (2026-03-27)


### Bug Fixes

* **ui:** voice waveform, mobile session actions, landing dot pattern ([c4e0551](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/c4e05514155593119b8ef470b294909cc429f67c))





## [0.2.62](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.61...v0.2.62) (2026-03-27)

### Detected changes
- .kiro: .kiro/specs/cig-node-onboarding/tasks.md
- apps: 8 changed file(s)
  - apps/docs/docs/en/architecture/components.md
  - apps/docs/docs/en/architecture/index.md
  - apps/docs/docs/en/architecture/system-design.md
  - apps/docs/docs/en/developer-guide/index.md
  - apps/docs/docs/en/getting-started/installation.md
  - apps/docs/docs/en/getting-started/quick-start.md
  - apps/docs/docs/en/next-steps.md
  - apps/docs/sidebars.ts


## [0.2.62](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.61...v0.2.62) (2026-03-27)





## [0.2.61](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.60...v0.2.61) (2026-03-27)

### Detected changes
- apps: 3 changed file(s)
  - apps/dashboard/components/ChatSessionPanel.tsx
  - apps/dashboard/components/ChatVoiceDialog.tsx
  - apps/landing/components/FallingPattern.tsx


## [0.2.61](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.60...v0.2.61) (2026-03-27)





## [0.2.60](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.59...v0.2.60) (2026-03-27)

### Detected changes
- packages: packages/infra/src/compose.ts


## [0.2.60](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.59...v0.2.60) (2026-03-27)





## [0.2.59](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.58...v0.2.59) (2026-03-27)

### Detected changes
- No source changes were detected; this release only advances version metadata.


## [0.2.59](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.58...v0.2.59) (2026-03-27)





## [0.2.58](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.57...v0.2.58) (2026-03-27)

### Detected changes
- root: .gitignore
- apps: 3 changed file(s)
  - apps/dashboard/app/providers.tsx
  - apps/dashboard/lib/__tests__/cigClient.test.ts
  - apps/dashboard/lib/cigClient.ts
- packages: 3 changed file(s)
  - packages/api/src/__tests__/managed-auth.test.ts
  - packages/api/src/auth.ts
  - packages/api/src/middleware/supabase-verify.ts


## [0.2.58](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.57...v0.2.58) (2026-03-27)





## [0.2.57](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.56...v0.2.57) (2026-03-27)


### Features

* **node-runtime:** implement exponential backoff retry ([73fc801](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/73fc80131a4f3149d2a5059407c9e01479458c2e))





## [0.2.57](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.56...v0.2.57) (2026-03-27)


### Features

* **node-runtime:** implement exponential backoff retry ([73fc801](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/73fc80131a4f3149d2a5059407c9e01479458c2e))





## [0.2.56](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.55...v0.2.56) (2026-03-27)


### Bug Fixes

* build errors in sdk and dashboard ([145fd70](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/145fd703f0871dc9aabeecd56ace12784f178672))





## [0.2.56](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.55...v0.2.56) (2026-03-27)


### Bug Fixes

* build errors in sdk and dashboard ([145fd70](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/145fd703f0871dc9aabeecd56ace12784f178672))





## [0.2.55](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.54...v0.2.55) (2026-03-27)


### Features

* current workspace changes ([82dba0f](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/82dba0f6e8ed2dea6ee319ad690993ff3ecfb526))





## [0.2.55](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.54...v0.2.55) (2026-03-27)


### Features

* current workspace changes ([82dba0f](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/82dba0f6e8ed2dea6ee319ad690993ff3ecfb526))





## [0.2.54](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.53...v0.2.54) (2026-03-27)

### Detected changes
- apps: 2 changed file(s)
  - apps/landing/components/AuthProvider.tsx
  - apps/landing/lib/dashboardHandoff.ts


## [0.2.54](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.53...v0.2.54) (2026-03-27)





## [0.2.53](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.52...v0.2.53) (2026-03-27)

### Detected changes
- apps: 10 changed file(s)
  - apps/landing/app/layout.tsx
  - apps/landing/app/page.tsx
  - apps/landing/app/providers.tsx
  - apps/landing/components/AuthButton.tsx
  - apps/landing/components/AuthProvider.tsx
  - apps/landing/components/AuthenticatedLanding.tsx
  - apps/landing/components/AuthentikProvider.tsx
  - apps/landing/components/DitheringShader.tsx
  - apps/landing/components/LandingLayout.tsx
  - apps/landing/lib/dashboardHandoff.ts


## [0.2.53](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.52...v0.2.53) (2026-03-27)





## [0.2.52](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.51...v0.2.52) (2026-03-27)

### Detected changes
- apps: 3 changed file(s)
  - apps/landing/components/AuthButton.tsx
  - apps/landing/components/AuthProvider.tsx
  - apps/landing/components/AuthenticatedLanding.tsx


## [0.2.52](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.51...v0.2.52) (2026-03-27)





## [0.2.51](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.50...v0.2.51) (2026-03-27)

### Detected changes
- apps: 3 changed file(s)
  - apps/landing/app/page.tsx
  - apps/landing/components/AuthButton.tsx
  - apps/landing/lib/dashboardHandoff.ts


## [0.2.51](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.50...v0.2.51) (2026-03-27)





## [0.2.50](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.49...v0.2.50) (2026-03-27)

### Detected changes
- apps: 24 changed file(s)
  - apps/dashboard/__tests__/middleware.test.ts
  - apps/dashboard/app/(dashboard)/layout.tsx
  - apps/dashboard/app/i18n.ts
  - apps/dashboard/app/layout.tsx
  - apps/dashboard/app/providers.tsx
  - apps/dashboard/app/requestLocale.ts
  - apps/dashboard/components/ChatContextItems.tsx
  - apps/dashboard/components/ChatVoiceCaptureBar.tsx
  - apps/dashboard/components/ChatVoiceDialog.tsx
  - apps/dashboard/components/ChatWidget.tsx
  - apps/dashboard/components/ProductionAuthGuard.tsx
  - apps/dashboard/components/__tests__/ChatVoiceDialog.test.tsx
  - apps/dashboard/components/__tests__/ChatWidget.test.tsx
  - apps/dashboard/components/__tests__/ProductionAuthGuard.test.tsx
  - apps/dashboard/lib/__tests__/authProvider.test.ts
  - apps/dashboard/lib/__tests__/siteUrl.test.ts
  - apps/dashboard/lib/authProvider.ts
  - apps/dashboard/lib/cigClient.ts
  - apps/dashboard/lib/siteUrl.ts
  - apps/dashboard/middleware.ts
  - apps/landing/app/page.tsx
  - apps/landing/components/AuthButton.tsx
  - apps/landing/components/AuthenticatedLanding.tsx
  - apps/landing/lib/dashboardHandoff.ts
- packages: 3 changed file(s)
  - packages/api/src/__tests__/chat.test.ts
  - packages/api/src/chat-inputs.ts
  - packages/ui/src/siteUrl.ts


## [0.2.50](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.49...v0.2.50) (2026-03-27)





## [0.2.49](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.48...v0.2.49) (2026-03-27)

### Detected changes
- apps: apps/landing/app/install/InstallContent.tsx


## [0.2.49](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.48...v0.2.49) (2026-03-27)





## [0.2.48](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.47...v0.2.48) (2026-03-27)

### Detected changes
- apps: apps/dashboard/components/ChatExamplesTab.tsx
- packages: 2 changed file(s)
  - packages/ui/src/components/chat/Sparkline.tsx
  - packages/ui/src/components/chat/SparklineCard.tsx


## [0.2.48](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.47...v0.2.48) (2026-03-27)





## [0.2.47](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.46...v0.2.47) (2026-03-27)

### Detected changes
- apps: apps/dashboard/components/ChatExamplesTab.tsx


## [0.2.47](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.46...v0.2.47) (2026-03-27)





## [0.2.46](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.45...v0.2.46) (2026-03-27)

### Detected changes
- root: 3 changed file(s)
  - .env.example
  - docker-compose.yml
  - pnpm-lock.yaml
- apps: 8 changed file(s)
  - apps/dashboard/components/ChatCodeComposerDialog.tsx
  - apps/dashboard/components/ChatContextItems.tsx
  - apps/dashboard/components/ChatLinkPickerDialog.tsx
  - apps/dashboard/components/ChatVoiceDialog.tsx
  - apps/dashboard/components/ChatWidget.tsx
  - apps/dashboard/components/__tests__/ChatWidget.test.tsx
  - apps/dashboard/jest.config.js
  - apps/dashboard/lib/api.ts
- config: config/env/manifest.cjs
- docs: 2 changed file(s)
  - docs/deployment/README.md
  - docs/development/README.md
- packages: 15 changed file(s)
  - packages/api/.env.example
  - packages/api/package.json
  - packages/api/src/__tests__/chat-inputs.test.ts
  - packages/api/src/__tests__/chat.test.ts
  - packages/api/src/chat-context.ts
  - packages/api/src/chat-inputs.ts
  - packages/api/src/chat-store.ts
  - packages/api/src/chat.ts
  - packages/api/src/db/migrations/004_chat_message_metadata.sql
  - packages/api/src/index.ts
  - packages/api/src/routes/chat.ts
  - packages/cli/src/compose-generator.ts
  - packages/infra/infra.config.ts
  - packages/sdk/src/client.ts
  - packages/sdk/src/types.ts


## [0.2.46](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.45...v0.2.46) (2026-03-27)





## [0.2.45](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.44...v0.2.45) (2026-03-27)

### Detected changes
- apps: 3 changed file(s)
  - apps/dashboard/components/ChatExamplesTab.tsx
  - apps/dashboard/components/ChatWidget.tsx
  - apps/dashboard/lib/chatTemplates.ts


## [0.2.45](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.44...v0.2.45) (2026-03-27)





## [0.2.44](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.43...v0.2.44) (2026-03-27)

### Detected changes
- apps: 5 changed file(s)
  - apps/dashboard/components/Footer.tsx
  - apps/dashboard/components/Sidebar.tsx
  - apps/dashboard/lib/__tests__/authProvider.test.ts
  - apps/dashboard/lib/siteUrl.ts
  - apps/docs/src/css/custom.css
- packages: packages/ui/src/siteUrl.ts


## [0.2.44](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.43...v0.2.44) (2026-03-27)





## [0.2.43](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.42...v0.2.43) (2026-03-26)

### Detected changes
- apps: 3 changed file(s)
  - apps/dashboard/components/ChatSessionPanel.tsx
  - apps/dashboard/components/ChatWidget.tsx
  - apps/dashboard/components/__tests__/ChatWidget.test.tsx
- packages: 9 changed file(s)
  - packages/i18n/catalogs/dashboard/en.json
  - packages/i18n/catalogs/dashboard/es.json
  - packages/i18n/catalogs/dashboard/zh.json
  - packages/i18n/src/locales/dashboard.ts
  - packages/i18n/src/locales/keys.ts
  - packages/ui/src/components/ConfirmDialog.tsx
  - packages/ui/src/components/ModalCard.tsx
  - packages/ui/src/components/UpdateDialog.tsx
  - packages/ui/src/components/index.ts


## [0.2.43](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.42...v0.2.43) (2026-03-26)





## [0.2.42](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.41...v0.2.42) (2026-03-26)

### Detected changes
- apps: 3 changed file(s)
  - apps/docs/src/css/custom.css
  - apps/docs/src/theme/DocSidebar/index.tsx
  - apps/docs/src/theme/DocSidebar/styles.css


## [0.2.42](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.41...v0.2.42) (2026-03-26)





## [0.2.41](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.40...v0.2.41) (2026-03-26)

### Detected changes
- apps: 6 changed file(s)
  - apps/dashboard/lib/__tests__/siteUrl.test.ts
  - apps/dashboard/lib/siteUrl.ts
  - apps/landing/app/install/InstallContent.tsx
  - apps/landing/app/page.tsx
  - apps/landing/components/AuthenticatedLanding.tsx
  - apps/landing/components/LandingLayout.tsx
- packages: 3 changed file(s)
  - packages/ui/package.json
  - packages/ui/src/siteUrl.client.ts
  - packages/ui/src/siteUrl.ts


## [0.2.41](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.40...v0.2.41) (2026-03-26)





## [0.2.40](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.39...v0.2.40) (2026-03-26)

### Detected changes
- apps: 2 changed file(s)
  - apps/docs/src/css/custom.css
  - apps/docs/src/theme/DocSidebar/styles.css


## [0.2.40](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.39...v0.2.40) (2026-03-26)





## [0.2.39](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.38...v0.2.39) (2026-03-26)

### Detected changes
- apps: 9 changed file(s)
  - apps/dashboard/components/ChatSessionPanel.tsx
  - apps/dashboard/components/ChatWidget.tsx
  - apps/dashboard/components/__tests__/ChatWidget.test.tsx
  - apps/dashboard/lib/api.ts
  - apps/dashboard/lib/siteUrl.ts
  - apps/landing/app/install/InstallContent.tsx
  - apps/landing/app/page.tsx
  - apps/landing/components/AuthenticatedLanding.tsx
  - apps/landing/components/LandingLayout.tsx
- packages: 13 changed file(s)
  - packages/api/src/__tests__/chat.test.ts
  - packages/api/src/chat-store.ts
  - packages/api/src/chat.ts
  - packages/api/src/routes/chat.ts
  - packages/i18n/catalogs/dashboard/en.json
  - packages/i18n/catalogs/dashboard/es.json
  - packages/i18n/catalogs/dashboard/zh.json
  - packages/i18n/src/locales/dashboard.ts
  - packages/i18n/src/locales/keys.ts
  - packages/sdk/src/client.ts
  - packages/sdk/src/types.ts
  - packages/ui/src/index.ts
  - packages/ui/src/siteUrl.ts


## [0.2.39](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.38...v0.2.39) (2026-03-26)





## [0.2.38](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.37...v0.2.38) (2026-03-26)

### Detected changes
- apps: 4 changed file(s)
  - apps/docs/src/components/DevPanel.tsx
  - apps/docs/src/theme/DocSidebar/index.tsx
  - apps/docs/src/theme/DocSidebar/styles.css
  - apps/docs/src/theme/Footer/index.tsx


## [0.2.38](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.37...v0.2.38) (2026-03-26)





## [0.2.37](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.36...v0.2.37) (2026-03-26)

### Detected changes
- apps: 2 changed file(s)
  - apps/dashboard/components/ChatSessionPanel.tsx
  - apps/dashboard/components/ChatWidget.tsx


## [0.2.37](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.36...v0.2.37) (2026-03-26)





## [0.2.36](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.35...v0.2.36) (2026-03-26)


### Bug Fixes

* **docs:** add top/bottom padding to canvas wrapper, reduce width to 90vw ([97b9346](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/97b934677dd66968f903d02fdc6af2bb71a94e5b))





## [0.2.36](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.35...v0.2.36) (2026-03-26)


### Bug Fixes

* **docs:** add top/bottom padding to canvas wrapper, reduce width to 90vw ([97b9346](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/97b934677dd66968f903d02fdc6af2bb71a94e5b))





## [0.2.35](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.34...v0.2.35) (2026-03-26)

### Detected changes
- apps: 3 changed file(s)
  - apps/dashboard/components/ChatSessionPanel.tsx
  - apps/dashboard/components/ChatWidget.tsx
  - apps/dashboard/components/__tests__/ChatWidget.test.tsx


## [0.2.35](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.34...v0.2.35) (2026-03-26)





## [0.2.34](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.33...v0.2.34) (2026-03-26)


### Bug Fixes

* **docs:** remove broken DocSidebar override, use CSS-only sidebar styling ([39ebeba](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/39ebeba5e98cb1d42835fb3b6c240a520757eb26))





## [0.2.34](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.33...v0.2.34) (2026-03-26)


### Bug Fixes

* **docs:** remove broken DocSidebar override, use CSS-only sidebar styling ([39ebeba](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/39ebeba5e98cb1d42835fb3b6c240a520757eb26))





## [0.2.33](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.32...v0.2.33) (2026-03-26)

### Detected changes
- apps: 4 changed file(s)
  - apps/dashboard/components/ChatSessionPanel.tsx
  - apps/dashboard/components/ChatWidget.tsx
  - apps/dashboard/components/__tests__/ChatWidget.test.tsx
  - apps/dashboard/lib/api.ts
- packages: 13 changed file(s)
  - packages/api/src/__tests__/chat.test.ts
  - packages/api/src/chat-store.ts
  - packages/api/src/chat.ts
  - packages/api/src/db/migrations/003_chat_sessions.sql
  - packages/api/src/db/schema.ts
  - packages/api/src/routes/chat.ts
  - packages/i18n/catalogs/dashboard/en.json
  - packages/i18n/catalogs/dashboard/es.json
  - packages/i18n/catalogs/dashboard/zh.json
  - packages/i18n/src/locales/dashboard.ts
  - packages/i18n/src/locales/keys.ts
  - packages/sdk/src/client.ts
  - packages/sdk/src/types.ts


## [0.2.33](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.32...v0.2.33) (2026-03-26)





## [0.2.32](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.31...v0.2.32) (2026-03-26)

### Detected changes
- apps: apps/docs/src/theme/DocSidebar/index.tsx


## [0.2.32](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.31...v0.2.32) (2026-03-26)





## [0.2.31](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.30...v0.2.31) (2026-03-26)

### Detected changes
- apps: apps/docs/src/theme/Footer/index.tsx


## [0.2.31](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.30...v0.2.31) (2026-03-26)





## [0.2.30](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.29...v0.2.30) (2026-03-26)

### Detected changes
- apps: apps/dashboard/components/ChatWidget.tsx


## [0.2.30](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.29...v0.2.30) (2026-03-26)





## [0.2.29](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.27...v0.2.29) (2026-03-26)


### Features

* **docs:** custom beautiful responsive sidebar override ([6d00988](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/6d009889cacd3d994ff8486a2dc4028e8953fbc0))





## [0.2.29](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.27...v0.2.29) (2026-03-26)


### Features

* **docs:** custom beautiful responsive sidebar override ([6d00988](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/6d009889cacd3d994ff8486a2dc4028e8953fbc0))





## [0.2.28](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.27...v0.2.28) (2026-03-26)

### Detected changes
- apps: 3 changed file(s)
  - apps/dashboard/components/ChatExamplesTab.tsx
  - apps/dashboard/components/ChatWidget.tsx
  - apps/dashboard/components/NotificationBell.tsx
- packages: packages/ui/src/components/chat/AlertCard.tsx


## [0.2.28](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.27...v0.2.28) (2026-03-26)





## [0.2.27](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.26...v0.2.27) (2026-03-26)

### Detected changes
- No source changes were detected; this release only advances version metadata.


## [0.2.27](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.26...v0.2.27) (2026-03-26)





## [0.2.26](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.25...v0.2.26) (2026-03-26)


### Bug Fixes

* **docs:** harden sidebar z-index layering to overlay full app ([9c8e0b7](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/9c8e0b72607e8fbd2b1cdb2ecb0721711d7050e4))





## [0.2.26](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.25...v0.2.26) (2026-03-26)


### Bug Fixes

* **docs:** harden sidebar z-index layering to overlay full app ([9c8e0b7](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/9c8e0b72607e8fbd2b1cdb2ecb0721711d7050e4))





## [0.2.25](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.24...v0.2.25) (2026-03-26)

### Detected changes
- .github: .github/workflows/deploy-api.yml
- apps: 7 changed file(s)
  - apps/dashboard/app/(dashboard)/devices/page.tsx
  - apps/dashboard/app/(dashboard)/page.tsx
  - apps/dashboard/components/Header.tsx
  - apps/dashboard/lib/__tests__/cigClient.test.ts
  - apps/dashboard/lib/cigClient.ts
  - apps/dashboard/public/runtime-version.json
  - apps/dashboard/public/sw.js
- config: config/env/manifest.cjs
- root: docker-compose.yml
- docs: docs/deployment/api-aws.md
- packages: 22 changed file(s)
  - packages/api/src/__tests__/managed-auth.test.ts
  - packages/api/src/auth.ts
  - packages/api/src/websocket.ts
  - packages/chatbot/src/chatbot.test.ts
  - packages/chatbot/src/rag.d.ts
  - packages/chatbot/src/rag.js
  - packages/chatbot/src/rag.ts
  - packages/chatbot/src/vectordb.d.ts
  - packages/chatbot/src/vectordb.js
  - packages/chatbot/src/vectordb.test.ts
  - packages/chatbot/src/vectordb.ts
  - packages/cli/src/__tests__/compose-generator.property.test.ts
  - packages/cli/src/compose-generator.ts
  - packages/infra/infra.config.test.ts
  - packages/infra/infra.config.ts
  - packages/infra/src/config/ConfigManager.test.ts
  - packages/infra/src/config/ConfigManager.ts
  - packages/infra/src/deployers/ApiDeployer.test.ts
  - packages/infra/src/deployers/ApiDeployer.ts
  - packages/infra/src/deployers/apiRuntime.test.ts
  - packages/infra/src/deployers/apiRuntime.ts
  - packages/infra/src/types.ts


## [0.2.25](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.24...v0.2.25) (2026-03-26)





## [0.2.24](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.23...v0.2.24) (2026-03-26)

### Detected changes
- apps: 2 changed file(s)
  - apps/dashboard/lib/siteUrl.ts
  - apps/docs/docusaurus.config.ts
- packages: 3 changed file(s)
  - packages/api/src/graphql.ts
  - packages/api/src/integration.test.ts
  - packages/api/src/routes.ts


## [0.2.24](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.23...v0.2.24) (2026-03-26)





## [0.2.23](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.22...v0.2.23) (2026-03-26)

### Detected changes
- apps: 12 changed file(s)
  - apps/dashboard/components/ChatExamplesTab.tsx
  - apps/dashboard/components/ChatWidget.tsx
  - apps/dashboard/components/Footer.tsx
  - apps/dashboard/components/__tests__/ChatExamplesTab.test.tsx
  - apps/dashboard/components/__tests__/ChatWidget.test.tsx
  - apps/dashboard/lib/__tests__/siteUrl.test.ts
  - apps/dashboard/lib/siteUrl.ts
  - apps/docs/docusaurus.config.ts
  - apps/docs/src/theme/Footer/index.tsx
  - apps/landing/app/page.tsx
  - apps/landing/components/AuthenticatedLanding.tsx
  - apps/landing/components/LandingLayout.tsx
- packages: 10 changed file(s)
  - packages/api/package.json
  - packages/api/src/index.ts
  - packages/api/src/integration.test.ts
  - packages/i18n/catalogs/dashboard/en.json
  - packages/i18n/catalogs/dashboard/es.json
  - packages/i18n/catalogs/dashboard/zh.json
  - packages/i18n/src/locales/dashboard.ts
  - packages/i18n/src/locales/keys.ts
  - packages/sdk/src/client.test.ts
  - packages/sdk/src/types.ts


## [0.2.23](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.22...v0.2.23) (2026-03-26)





## [0.2.22](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.21...v0.2.22) (2026-03-26)

### Detected changes
- apps: 3 changed file(s)
  - apps/dashboard/components/Sidebar.tsx
  - apps/dashboard/lib/siteUrl.ts
  - apps/dashboard/next.config.js
- packages: 3 changed file(s)
  - packages/i18n/catalogs/dashboard/en.json
  - packages/i18n/catalogs/dashboard/es.json
  - packages/i18n/catalogs/dashboard/zh.json


## [0.2.22](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.21...v0.2.22) (2026-03-26)





## [0.2.21](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.19...v0.2.21) (2026-03-26)


### Bug Fixes

* **docs:** resolve process is not defined error in footer ([d1a6d44](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/d1a6d4444687a59da26d396183ad73856f69e504))





## [0.2.21](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.19...v0.2.21) (2026-03-26)


### Bug Fixes

* **docs:** resolve process is not defined error in footer ([d1a6d44](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/d1a6d4444687a59da26d396183ad73856f69e504))





## [0.2.20](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.19...v0.2.20) (2026-03-26)

### Detected changes
- apps: 3 changed file(s)
  - apps/dashboard/components/ChatExamplesTab.tsx
  - apps/dashboard/components/ChatWidget.tsx
  - apps/docs/package.json
- packages: 24 changed file(s)
  - packages/i18n/catalogs/dashboard/en.json
  - packages/i18n/catalogs/dashboard/es.json
  - packages/i18n/catalogs/dashboard/zh.json
  - packages/ui/src/components/chat/AlertCard.tsx
  - packages/ui/src/components/chat/AlertItem.tsx
  - packages/ui/src/components/chat/AlertStrip.tsx
  - packages/ui/src/components/chat/BarChartCard.tsx
  - packages/ui/src/components/chat/CardHeader.tsx
  - packages/ui/src/components/chat/ChatBubble.tsx
  - packages/ui/src/components/chat/ChatCard.tsx
  - packages/ui/src/components/chat/GaugeCard.tsx
  - packages/ui/src/components/chat/KpiBox.tsx
  - packages/ui/src/components/chat/Sparkline.tsx
  - packages/ui/src/components/chat/SparklineCard.tsx
  - packages/ui/src/components/chat/StarFeedback.tsx
  - packages/ui/src/components/chat/StatusBar.tsx
  - packages/ui/src/components/chat/StatusChip.tsx
  - packages/ui/src/components/chat/SummaryBadges.tsx
  - packages/ui/src/components/chat/TimelineCard.tsx
  - packages/ui/src/components/chat/index.ts
  - packages/ui/src/components/chat/reference/CIG-Bot Guia Simbolos.html
  - packages/ui/src/components/chat/reference/CIG-Bot Visualización.html
  - packages/ui/src/components/chat/types.ts
  - packages/ui/src/components/index.ts
- root: versioning.config.json


## [0.2.20](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.19...v0.2.20) (2026-03-26)





## [0.2.19](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.18...v0.2.19) (2026-03-26)


### Bug Fixes

* **docs:** improve sidebar z-index layering for mobile ([6f64c57](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/6f64c574fb43ed0f6ff2d05df3bcd61a63a93d40))





## [0.2.19](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.18...v0.2.19) (2026-03-26)


### Bug Fixes

* **docs:** improve sidebar z-index layering for mobile ([6f64c57](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/6f64c574fb43ed0f6ff2d05df3bcd61a63a93d40))





## [0.2.18](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.17...v0.2.18) (2026-03-26)

### Detected changes
- apps: 5 changed file(s)
  - apps/dashboard/components/BootstrapRedirect.tsx
  - apps/dashboard/components/ChatWidget.tsx
  - apps/dashboard/components/__tests__/ChatWidget.test.tsx
  - apps/dashboard/lib/api.ts
  - apps/dashboard/middleware.ts
- packages: 7 changed file(s)
  - packages/api/package.json
  - packages/api/scripts/dev-runner.mjs
  - packages/api/src/index.ts
  - packages/api/src/integration.test.ts
  - packages/sdk/src/client.test.ts
  - packages/sdk/src/client.ts
  - packages/sdk/src/types.ts


## [0.2.18](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.17...v0.2.18) (2026-03-26)





## [0.2.17](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.16...v0.2.17) (2026-03-26)


### Features

* add report link to footer and version display in docs ([a2680fd](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/a2680fd515a153803bf53710f867db7dfebb4a53))





## [0.2.17](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.16...v0.2.17) (2026-03-26)


### Features

* add report link to footer and version display in docs ([a2680fd](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/a2680fd515a153803bf53710f867db7dfebb4a53))





## [0.2.16](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.14...v0.2.16) (2026-03-26)


### Bug Fixes

* **dashboard:** improve canvas responsiveness and sidebar mobile display ([2bfd21a](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/2bfd21ae3bf040e9f2bad1951c65bde87f8b6102))





## [0.2.16](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.14...v0.2.16) (2026-03-26)


### Bug Fixes

* **dashboard:** improve canvas responsiveness and sidebar mobile display ([2bfd21a](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/2bfd21ae3bf040e9f2bad1951c65bde87f8b6102))





## [0.2.15](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.14...v0.2.15) (2026-03-26)

### Detected changes
- No source changes were detected; this release only advances version metadata.


## [0.2.15](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.14...v0.2.15) (2026-03-26)







## [0.2.14](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.13...v0.2.14) (2026-03-26)

### Detected changes
- apps: apps/docs/src/css/custom.css


## [0.2.13](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.12...v0.2.13) (2026-03-26)

### Detected changes
- apps: 3 changed file(s)
  - apps/dashboard/components/NotificationBell.tsx
  - apps/dashboard/public/runtime-version.json
  - apps/landing/public/runtime-version.json


## [0.2.13](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.12...v0.2.13) (2026-03-26)





## [0.2.12](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.11...v0.2.12) (2026-03-26)


### Bug Fixes

* **docs:** canvas 95vw boundary, mobile modal, compact toolbar ([78ff4a4](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/78ff4a49096fbe374c49e8de98216d68adfe338a))





## [0.2.12](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.11...v0.2.12) (2026-03-26)


### Bug Fixes

* **docs:** canvas 95vw boundary, mobile modal, compact toolbar ([78ff4a4](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/78ff4a49096fbe374c49e8de98216d68adfe338a))





## [0.2.11](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.10...v0.2.11) (2026-03-26)

### Detected changes
- apps: 9 changed file(s)
  - apps/dashboard/app/(dashboard)/bootstrap/page.tsx
  - apps/dashboard/app/providers.tsx
  - apps/dashboard/components/BootstrapRedirect.tsx
  - apps/dashboard/components/NotificationBell.tsx
  - apps/dashboard/components/__tests__/BootstrapRedirect.test.tsx
  - apps/dashboard/lib/__tests__/authProvider.test.ts
  - apps/dashboard/lib/bootstrapPreferences.ts
  - apps/dashboard/public/runtime-version.json
  - apps/landing/public/runtime-version.json
- infra: infra/docker/Dockerfile.api
- packages: 2 changed file(s)
  - packages/api/src/__tests__/auth-email.test.ts
  - packages/api/src/routes/auth-email.ts


## [0.2.11](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.10...v0.2.11) (2026-03-26)





## [0.2.10](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.8...v0.2.10) (2026-03-26)


### Bug Fixes

* **docs:** canvas scroll lock, mobile text, zoom toolbar, fit-all ([d2aca2e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/d2aca2ef107892f4e6ddea1d134f59747db36623))





## [0.2.10](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.8...v0.2.10) (2026-03-26)


### Bug Fixes

* **docs:** canvas scroll lock, mobile text, zoom toolbar, fit-all ([d2aca2e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/d2aca2ef107892f4e6ddea1d134f59747db36623))





## [0.2.9](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.8...v0.2.9) (2026-03-26)

### Detected changes
- apps: 27 changed file(s)
  - apps/dashboard/app/(dashboard)/notifications/page.tsx
  - apps/dashboard/app/layout.tsx
  - apps/dashboard/components/ChatWidget.tsx
  - apps/dashboard/components/NotificationBell.tsx
  - apps/dashboard/components/Sidebar.tsx
  - apps/dashboard/public/cig-icon.svg
  - apps/dashboard/public/favicon.ico
  - apps/dashboard/public/icon-128x128.png
  - apps/dashboard/public/icon-144x144.png
  - apps/dashboard/public/icon-152x152.png
  - apps/dashboard/public/icon-16x16.png
  - apps/dashboard/public/icon-180x180.png
  - apps/dashboard/public/icon-192x192.png
  - apps/dashboard/public/icon-32x32.png
  - apps/dashboard/public/icon-384x384.png
  - apps/dashboard/public/icon-48x48.png
  - apps/dashboard/public/icon-512x512.png
  - apps/dashboard/public/icon-72x72.png
  - apps/dashboard/public/icon-96x96.png
  - apps/dashboard/public/runtime-version.json
  - apps/dashboard/public/site.webmanifest
  - apps/dashboard/public/sw.js
  - apps/landing/app/page.tsx
  - apps/landing/components/LandingLayout.tsx
  - apps/landing/next.config.js
  - apps/landing/public/runtime-version.json
  - apps/landing/public/sw.js
- packages: 9 changed file(s)
  - packages/api/package.json
  - packages/api/src/routes.ts
  - packages/i18n/catalogs/dashboard/en.json
  - packages/i18n/catalogs/dashboard/es.json
  - packages/i18n/catalogs/dashboard/zh.json
  - packages/i18n/catalogs/shared/en.json
  - packages/i18n/catalogs/shared/es.json
  - packages/i18n/catalogs/shared/zh.json
  - packages/ui/src/components/FooterBar.tsx
- root: pnpm-lock.yaml


## [0.2.9](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.8...v0.2.9) (2026-03-26)





## [0.2.8](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.7...v0.2.8) (2026-03-26)

### Detected changes
- apps: 8 changed file(s)
  - apps/dashboard/app/(dashboard)/graph/page.tsx
  - apps/dashboard/app/(dashboard)/page.tsx
  - apps/dashboard/e2e/realtime-updates.spec.ts
  - apps/dashboard/lib/browserApi.ts
  - apps/dashboard/public/runtime-version.json
  - apps/dashboard/public/sw.js
  - apps/landing/public/runtime-version.json
  - apps/landing/public/sw.js
- root: docker-compose.yml
- packages: 15 changed file(s)
  - packages/api/src/__tests__/chat.test.ts
  - packages/api/src/chat.ts
  - packages/api/src/routes.ts
  - packages/api/src/routes/chat.ts
  - packages/api/src/routes/device-auth.ts
  - packages/auth/src/index.ts
  - packages/chatbot/src/vectordb.d.ts
  - packages/chatbot/src/vectordb.js
  - packages/chatbot/src/vectordb.test.ts
  - packages/chatbot/src/vectordb.ts
  - packages/cli/src/__tests__/compose-generator.property.test.ts
  - packages/cli/src/commands/install.ts
  - packages/cli/src/compose-generator.ts
  - packages/sdk/src/client.test.ts
  - packages/sdk/src/client.ts
- scripts: scripts/release.sh


## [0.2.8](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.7...v0.2.8) (2026-03-26)





## [0.2.6](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.5...v0.2.6) (2026-03-26)


### Bug Fixes

* **docs:** resolve all ESLint errors and warnings in CI ([04ea3ef](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/04ea3efe6a5bcabf7735c1f9f0b88105974a61f7))





## [0.2.6](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.5...v0.2.6) (2026-03-26)


### Bug Fixes

* **docs:** resolve all ESLint errors and warnings in CI ([04ea3ef](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/04ea3efe6a5bcabf7735c1f9f0b88105974a61f7))





## [0.2.4](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.2...v0.2.4) (2026-03-26)


### Bug Fixes

* **ci:** always build cartography bundle image ([02614a8](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/02614a884ea0833f19868bbac24a94b21d0dcb53))
* **ci:** correct cartography bundle build context ([df9704e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/df9704e5b2189e85efa4691ba007829d5f9654cc))
* **ci:** correct cartography publish dockerfile path ([79f4882](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/79f4882aa6b57300bd6e4607ec6986c95650b50b))
* **ci:** publish bundle asset on workflow dispatch ([fc73ceb](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/fc73cebe3ffeb66e98b9d3ff621785daf55320be))
* **ci:** publish pinned neo4j image in bundle manifest ([05ccc92](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/05ccc9251c84610124751828771f743c50a52406))





## [0.2.4](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.2...v0.2.4) (2026-03-26)


### Bug Fixes

* **ci:** always build cartography bundle image ([02614a8](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/02614a884ea0833f19868bbac24a94b21d0dcb53))
* **ci:** correct cartography bundle build context ([df9704e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/df9704e5b2189e85efa4691ba007829d5f9654cc))
* **ci:** correct cartography publish dockerfile path ([79f4882](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/79f4882aa6b57300bd6e4607ec6986c95650b50b))
* **ci:** publish bundle asset on workflow dispatch ([fc73ceb](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/fc73cebe3ffeb66e98b9d3ff621785daf55320be))
* **ci:** publish pinned neo4j image in bundle manifest ([05ccc92](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/05ccc9251c84610124751828771f743c50a52406))





## [0.2.3](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.2...v0.2.3) (2026-03-26)


### Bug Fixes

* **ci:** always build cartography bundle image ([02614a8](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/02614a884ea0833f19868bbac24a94b21d0dcb53))
* **ci:** correct cartography bundle build context ([df9704e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/df9704e5b2189e85efa4691ba007829d5f9654cc))





## [0.2.3](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.2...v0.2.3) (2026-03-26)


### Bug Fixes

* **ci:** always build cartography bundle image ([02614a8](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/02614a884ea0833f19868bbac24a94b21d0dcb53))
* **ci:** correct cartography bundle build context ([df9704e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/df9704e5b2189e85efa4691ba007829d5f9654cc))





## [0.2.2](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.0...v0.2.2) (2026-03-26)


### Bug Fixes

* **release:** use previous cli tag floor ([9567240](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/9567240cc1c4d1c555e110d66c514235dc006125))





## [0.2.2](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.0...v0.2.2) (2026-03-26)


### Bug Fixes

* **release:** use previous cli tag floor ([9567240](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/9567240cc1c4d1c555e110d66c514235dc006125))





## [0.2.1](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.0...v0.2.1) (2026-03-26)


### Bug Fixes

* **release:** use previous cli tag floor ([9567240](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/9567240cc1c4d1c555e110d66c514235dc006125))





## [0.2.1](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.2.0...v0.2.1) (2026-03-26)


### Bug Fixes

* **release:** use previous cli tag floor ([9567240](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/9567240cc1c4d1c555e110d66c514235dc006125))





# [0.2.0](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.120...v0.2.0) (2026-03-26)


### Bug Fixes

* **cli:** clean up 0.1.8 release notes ([5bbc069](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/5bbc069353470a7f69ee8ae38573a776ca5c9fff))
* **cli:** keep interactive installer attached to tty ([303916e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/303916edbd53e9901a43e347dde954e8a78edb1b))
* **cli:** keep setup cancel flow open ([fc4dfe5](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/fc4dfe5c6b17e29bb91b205b4c74acd530773b2d))
* **cli:** keep setup wizard open until dismiss ([991fc9e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/991fc9ebcebed2c7514597dc955450682acd2423))
* **cli:** stage workspace lockfile in release ([4375110](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/4375110807d42af474dc1f9210423eb5dfb6e9ab))
* **install:** keep piped installer interactive ([3a56c34](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/3a56c343405c86885c3707b15fc4a7ca77124d2b))
* **install:** show npm version resolution progress ([0f310aa](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/0f310aab2e1a63daf95aec8bdd9f2a418b67196f))
* **release:** allow tagged releases after follow-up commits ([414dae5](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/414dae53cba73058953c78ff54b5e10c30d8ffd0))
* **release:** support cli release tags in guard ([d250a66](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/d250a660980e0f2079bc4f6c83e767d1fe9b38d9))


### Features

* **docs:** release v0.2.0 - @cig/docs documentation system ([d85da56](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/d85da56e3698186b5e4ca6830759c521a4f8102e))





# [0.2.0](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.120...v0.2.0) (2026-03-26)


### Bug Fixes

* **cli:** clean up 0.1.8 release notes ([5bbc069](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/5bbc069353470a7f69ee8ae38573a776ca5c9fff))
* **cli:** keep interactive installer attached to tty ([303916e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/303916edbd53e9901a43e347dde954e8a78edb1b))
* **cli:** keep setup cancel flow open ([fc4dfe5](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/fc4dfe5c6b17e29bb91b205b4c74acd530773b2d))
* **cli:** keep setup wizard open until dismiss ([991fc9e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/991fc9ebcebed2c7514597dc955450682acd2423))
* **cli:** stage workspace lockfile in release ([4375110](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/4375110807d42af474dc1f9210423eb5dfb6e9ab))
* **install:** keep piped installer interactive ([3a56c34](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/3a56c343405c86885c3707b15fc4a7ca77124d2b))
* **install:** show npm version resolution progress ([0f310aa](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/0f310aab2e1a63daf95aec8bdd9f2a418b67196f))
* **release:** allow tagged releases after follow-up commits ([414dae5](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/414dae53cba73058953c78ff54b5e10c30d8ffd0))
* **release:** support cli release tags in guard ([d250a66](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/d250a660980e0f2079bc4f6c83e767d1fe9b38d9))


### Features

* **docs:** release v0.2.0 - @cig/docs documentation system ([d85da56](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/d85da56e3698186b5e4ca6830759c521a4f8102e))





## [0.2.0](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.126...v0.2.0) (2026-03-26)

### Features

* **docs:** launch @cig/docs documentation system (Phase 18)
  - Docusaurus v3 app at apps/docs with TypeScript
  - Development server at http://localhost:3004 with HMR and live reload
  - Error boundary component with full stack traces in dev mode
  - Development tools panel for testing i18n, Mermaid, search, and analytics locally
  - Mock analytics, devI18n, devMermaid, devSearch utilities
  - 32 passing tests (Jest + Testing Library)
  - Integrated into monorepo via turbo.json and dev:all script
  - Documentation structure for 7 languages (en, es, pt, fr, de, zh, ja)


## [0.1.126](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.125...v0.1.126) (2026-03-26)

### Detected changes
- apps: 4 changed file(s)
  - apps/dashboard/public/runtime-version.json
  - apps/dashboard/public/sw.js
  - apps/landing/components/AuthButton.tsx
  - apps/landing/public/runtime-version.json
- packages: 2 changed file(s)
  - packages/i18n/catalogs/shared/es.json
  - packages/i18n/src/locales/shared.ts


## [0.1.126](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.125...v0.1.126) (2026-03-26)





## [0.1.125](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.124...v0.1.125) (2026-03-26)

### Detected changes
- apps: 3 changed file(s)
  - apps/dashboard/components/ChatWidget.tsx
  - apps/dashboard/public/runtime-version.json
  - apps/dashboard/public/sw.js


## [0.1.125](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.124...v0.1.125) (2026-03-26)





## [0.1.124](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.122...v0.1.124) (2026-03-26)


### Bug Fixes

* **cli:** clean up 0.1.8 release notes ([5bbc069](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/5bbc069353470a7f69ee8ae38573a776ca5c9fff))
* **cli:** keep interactive installer attached to tty ([303916e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/303916edbd53e9901a43e347dde954e8a78edb1b))
* **cli:** keep setup cancel flow open ([fc4dfe5](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/fc4dfe5c6b17e29bb91b205b4c74acd530773b2d))
* **cli:** keep setup wizard open until dismiss ([991fc9e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/991fc9ebcebed2c7514597dc955450682acd2423))
* **cli:** stage workspace lockfile in release ([4375110](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/4375110807d42af474dc1f9210423eb5dfb6e9ab))
* **install:** keep piped installer interactive ([3a56c34](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/3a56c343405c86885c3707b15fc4a7ca77124d2b))
* **install:** show npm version resolution progress ([0f310aa](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/0f310aab2e1a63daf95aec8bdd9f2a418b67196f))
* **release:** allow tagged releases after follow-up commits ([414dae5](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/414dae53cba73058953c78ff54b5e10c30d8ffd0))
* **release:** support cli release tags in guard ([d250a66](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/d250a660980e0f2079bc4f6c83e767d1fe9b38d9))





## [0.1.124](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.122...v0.1.124) (2026-03-26)


### Bug Fixes

* **cli:** clean up 0.1.8 release notes ([5bbc069](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/5bbc069353470a7f69ee8ae38573a776ca5c9fff))
* **cli:** keep interactive installer attached to tty ([303916e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/303916edbd53e9901a43e347dde954e8a78edb1b))
* **cli:** keep setup cancel flow open ([fc4dfe5](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/fc4dfe5c6b17e29bb91b205b4c74acd530773b2d))
* **cli:** keep setup wizard open until dismiss ([991fc9e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/991fc9ebcebed2c7514597dc955450682acd2423))
* **cli:** stage workspace lockfile in release ([4375110](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/4375110807d42af474dc1f9210423eb5dfb6e9ab))
* **install:** keep piped installer interactive ([3a56c34](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/3a56c343405c86885c3707b15fc4a7ca77124d2b))
* **install:** show npm version resolution progress ([0f310aa](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/0f310aab2e1a63daf95aec8bdd9f2a418b67196f))
* **release:** allow tagged releases after follow-up commits ([414dae5](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/414dae53cba73058953c78ff54b5e10c30d8ffd0))
* **release:** support cli release tags in guard ([d250a66](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/d250a660980e0f2079bc4f6c83e767d1fe9b38d9))





## [0.1.123](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.122...v0.1.123) (2026-03-26)


### Bug Fixes

* **cli:** clean up 0.1.8 release notes ([5bbc069](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/5bbc069353470a7f69ee8ae38573a776ca5c9fff))
* **cli:** keep interactive installer attached to tty ([303916e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/303916edbd53e9901a43e347dde954e8a78edb1b))
* **cli:** keep setup cancel flow open ([fc4dfe5](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/fc4dfe5c6b17e29bb91b205b4c74acd530773b2d))
* **cli:** keep setup wizard open until dismiss ([991fc9e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/991fc9ebcebed2c7514597dc955450682acd2423))
* **cli:** stage workspace lockfile in release ([4375110](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/4375110807d42af474dc1f9210423eb5dfb6e9ab))
* **install:** show npm version resolution progress ([0f310aa](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/0f310aab2e1a63daf95aec8bdd9f2a418b67196f))
* **release:** allow tagged releases after follow-up commits ([414dae5](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/414dae53cba73058953c78ff54b5e10c30d8ffd0))
* **release:** support cli release tags in guard ([d250a66](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/d250a660980e0f2079bc4f6c83e767d1fe9b38d9))





## [0.1.123](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.122...v0.1.123) (2026-03-26)


### Bug Fixes

* **cli:** clean up 0.1.8 release notes ([5bbc069](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/5bbc069353470a7f69ee8ae38573a776ca5c9fff))
* **cli:** keep interactive installer attached to tty ([303916e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/303916edbd53e9901a43e347dde954e8a78edb1b))
* **cli:** keep setup cancel flow open ([fc4dfe5](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/fc4dfe5c6b17e29bb91b205b4c74acd530773b2d))
* **cli:** keep setup wizard open until dismiss ([991fc9e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/991fc9ebcebed2c7514597dc955450682acd2423))
* **cli:** stage workspace lockfile in release ([4375110](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/4375110807d42af474dc1f9210423eb5dfb6e9ab))
* **install:** show npm version resolution progress ([0f310aa](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/0f310aab2e1a63daf95aec8bdd9f2a418b67196f))
* **release:** allow tagged releases after follow-up commits ([414dae5](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/414dae53cba73058953c78ff54b5e10c30d8ffd0))
* **release:** support cli release tags in guard ([d250a66](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/d250a660980e0f2079bc4f6c83e767d1fe9b38d9))





## [0.1.122](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.121...v0.1.122) (2026-03-25)

### Detected changes
- scripts: 3 changed file(s)
  - scripts/release.sh
  - scripts/validate-release-ref.sh
  - scripts/validate-release-ref.test.sh


## [0.1.122](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.121...v0.1.122) (2026-03-25)





## [0.1.121](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.120...v0.1.121) (2026-03-25)

### Features

* **landing:** add a copy-to-clipboard action to the public install card
* **landing:** split the install page into a server shell and interactive install content
* **i18n:** refine install-card copy for the public curl installer

### Release

* bump the root, landing, and CLI package versions to `0.1.121`
* keep the public install guide aligned with the published npm binary

## [0.1.120](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.118...v0.1.120) (2026-03-25)


### Bug Fixes

* **auth:** prevent race condition in landing auth state sync ([77272f6](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/77272f6d86ed7bf1fbd7b7ba53b324f5c84cc79a))
* **cli:** keep setup wizard interactive ([78e9f74](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/78e9f746a3d9911ac1b31e3a0c6ac16daa5b548e))
* **cli:** repair v0.1.6 release notes ([daa280e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/daa280eb99e7f88df9d3af1fabb3d5b0590f66e9))
* **cli:** resolve public installer versioning ([de7be3c](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/de7be3cf6d6b72967bef772c708ca50eb5c87e2b))





## [0.1.119](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.118...v0.1.119) (2026-03-25)


### Bug Fixes

* **auth:** prevent race condition in landing auth state sync ([77272f6](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/77272f6d86ed7bf1fbd7b7ba53b324f5c84cc79a))
* **cli:** keep setup wizard interactive ([78e9f74](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/78e9f746a3d9911ac1b31e3a0c6ac16daa5b548e))
* **cli:** repair v0.1.6 release notes ([daa280e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/daa280eb99e7f88df9d3af1fabb3d5b0590f66e9))
* **cli:** resolve public installer versioning ([de7be3c](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/de7be3cf6d6b72967bef772c708ca50eb5c87e2b))





## [0.1.118](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.117...v0.1.118) (2026-03-25)


### Bug Fixes

* **cli:** repair v0.1.3 release notes ([d3eaf01](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/d3eaf01f7edf75766965c1e4b6b29c7af09cb5e7))
* **cli:** repair v0.1.4 release notes ([8ddf54a](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/8ddf54a30a25005e1dc49eb0d14340438338243b))
* **cli:** reset package release line to 0.1.2 ([b4fdfb1](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/b4fdfb16f71ad6a99011b255a3ce2c665aff876e))


### Features

* **cli:** add setup wizard and graph seeding ([451f850](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/451f8505ccf2456082560b4283e84a92a96d50ff))
* **landing:** add LandingLayout component with navbar/footer for install page ([b421f6e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/b421f6e3777bd5152e5b1bda2e83b12ab1d7c885))
* **landing:** publish public installer and guide ([192ab4b](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/192ab4b3ebffc5d5b98a6821c417189a9bd1f60c))





## [0.1.117](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.116...v0.1.117) (2026-03-25)

### Detected changes
- .husky: .husky/pre-push
- apps: 2 changed file(s)
  - apps/dashboard/public/runtime-version.json
  - apps/dashboard/public/sw.js
- root: package.json
- scripts: 6 changed file(s)
  - scripts/release-version.mjs
  - scripts/release.sh
  - scripts/validate-release-ref.sh
  - scripts/validate-release-ref.test.sh
  - scripts/validate-release-version.mjs
  - scripts/validate-release-version.test.mjs


## [0.1.117](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.116...v0.1.117) (2026-03-25)





## [0.1.116](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.115...v0.1.116) (2026-03-25)

### Detected changes
- apps: apps/dashboard/components/Footer.tsx


## [0.1.116](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.115...v0.1.116) (2026-03-25)





## [0.1.115](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.114...v0.1.115) (2026-03-25)

### Detected changes
- apps: 3 changed file(s)
  - apps/dashboard/public/runtime-version.json
  - apps/dashboard/public/sw.js
  - apps/landing/public/runtime-version.json


## [0.1.115](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.114...v0.1.115) (2026-03-25)





## [0.1.114](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.113...v0.1.114) (2026-03-25)

### Detected changes
- apps: 3 changed file(s)
  - apps/dashboard/public/runtime-version.json
  - apps/dashboard/public/sw.js
  - apps/landing/public/runtime-version.json
- packages: 2 changed file(s)
  - packages/api/src/__tests__/auth-email.test.ts
  - packages/api/src/routes/auth-email.ts


## [0.1.114](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.113...v0.1.114) (2026-03-25)





## [0.1.113](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.112...v0.1.113) (2026-03-25)

### Detected changes
- .github: .github/workflows/deploy-api.yml


## [0.1.113](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.112...v0.1.113) (2026-03-25)





## [0.1.112](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.111...v0.1.112) (2026-03-25)

### Detected changes
- .github: .github/workflows/deploy-api.yml
- docs: docs/deployment/api-aws.md
- packages: packages/infra/README.md


## [0.1.112](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.111...v0.1.112) (2026-03-25)





## [0.1.111](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.110...v0.1.111) (2026-03-25)

### Detected changes
- No source changes were detected; this release only advances version metadata.


## [0.1.111](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.110...v0.1.111) (2026-03-25)





## [0.1.110](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.109...v0.1.110) (2026-03-25)

### Detected changes
- .github: .github/workflows/deploy-api.yml
- docs: docs/deployment/api-aws.md
- packages: 6 changed file(s)
  - packages/api/src/__tests__/auth-email.test.ts
  - packages/infra/README.md
  - packages/infra/infra.config.test.ts
  - packages/infra/src/config/ConfigManager.test.ts
  - packages/infra/src/deployers/ApiDeployer.test.ts
  - packages/infra/src/deployers/apiRuntime.test.ts


## [0.1.110](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.109...v0.1.110) (2026-03-25)





## [0.1.109](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.107...v0.1.109) (2026-03-25)


### Bug Fixes

* **emails:** improve font contrast for spam filter compatibility ([ee23cd7](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/ee23cd70d0fb59cc9967c4093d07b0c0dbdc7b24)), closes [#a1a1](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/issues/a1a1) [#b8b8c0](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/issues/b8b8c0)





## [0.1.109](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.107...v0.1.109) (2026-03-25)


### Bug Fixes

* **emails:** improve font contrast for spam filter compatibility ([ee23cd7](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/ee23cd70d0fb59cc9967c4093d07b0c0dbdc7b24)), closes [#a1a1](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/issues/a1a1) [#b8b8c0](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/issues/b8b8c0)





## [0.1.108](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.107...v0.1.108) (2026-03-25)


### Bug Fixes

* **emails:** improve font contrast for spam filter compatibility ([ef52ba0](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/ef52ba031c599cecc63fbe019c7ab798f6129441)), closes [#a1a1](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/issues/a1a1) [#b8b8c0](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/issues/b8b8c0)





## [0.1.107](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.106...v0.1.107) (2026-03-25)

### Detected changes
- .github: .github/workflows/deploy-api.yml
- docs: docs/deployment/api-aws.md
- root: package.json
- packages: 3 changed file(s)
  - packages/infra/README.md
  - packages/infra/src/config/ConfigManager.test.ts
  - packages/infra/src/deployers/ApiDeployer.test.ts
- scripts: 3 changed file(s)
  - scripts/api-impact.mjs
  - scripts/api-impact.test.mjs
  - scripts/detect-api-impact.mjs


## [0.1.107](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.106...v0.1.107) (2026-03-25)





## [0.1.106](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.105...v0.1.106) (2026-03-25)

### Detected changes
- apps: 2 changed file(s)
  - apps/landing/components/AuthProvider.tsx
  - apps/landing/public/runtime-version.json


## [0.1.106](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.105...v0.1.106) (2026-03-25)





## [0.1.105](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.104...v0.1.105) (2026-03-25)

### Detected changes
- apps: 4 changed file(s)
  - apps/dashboard/lib/__tests__/authProvider.test.ts
  - apps/dashboard/lib/authProvider.ts
  - apps/landing/components/AuthProvider.tsx
  - apps/landing/components/AuthentikProvider.tsx
- packages: 2 changed file(s)
  - packages/auth/src/index.ts
  - packages/auth/src/session.ts


## [0.1.105](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.104...v0.1.105) (2026-03-25)





## [0.1.104](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.103...v0.1.104) (2026-03-25)

### Detected changes
- apps: 5 changed file(s)
  - apps/dashboard/app/auth/callback/page.tsx
  - apps/dashboard/lib/__tests__/authProvider.test.ts
  - apps/dashboard/lib/authProvider.ts
  - apps/dashboard/lib/sessionAuth.ts
  - apps/landing/components/AuthenticatedLanding.tsx


## [0.1.104](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.103...v0.1.104) (2026-03-25)





## [0.1.103](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.102...v0.1.103) (2026-03-25)

### Detected changes
- packages: 2 changed file(s)
  - packages/infra/infra.config.test.ts
  - packages/infra/infra.config.ts


## [0.1.103](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.102...v0.1.103) (2026-03-25)





## [0.1.102](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.101...v0.1.102) (2026-03-25)

### Detected changes
- apps: 6 changed file(s)
  - apps/dashboard/lib/__tests__/authProvider.test.ts
  - apps/dashboard/lib/authProvider.ts
  - apps/dashboard/public/runtime-version.json
  - apps/dashboard/public/sw.js
  - apps/landing/components/AuthProvider.tsx
  - apps/landing/public/runtime-version.json


## [0.1.102](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.101...v0.1.102) (2026-03-25)





## [0.1.101](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.100...v0.1.101) (2026-03-25)

### Detected changes
- apps: 2 changed file(s)
  - apps/dashboard/public/runtime-version.json
  - apps/landing/public/runtime-version.json
- packages: packages/emails/src/templates/sign-in.html


## [0.1.101](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.100...v0.1.101) (2026-03-25)









## [0.1.99](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.98...v0.1.99) (2026-03-24)

### Bug Fixes
- ensure logout completes on the first click for Supabase sessions and preserves Authentik RP-initiated logout for OIDC sessions
- keep logout routing aligned with the session source stored by landing and dashboard auth flows





## [0.1.98](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.97...v0.1.98) (2026-03-24)

### Detected changes
- packages: 2 changed file(s)
  - packages/api/src/index.ts
  - packages/api/src/security-testing.test.ts


## [0.1.98](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.97...v0.1.98) (2026-03-24)





## [0.1.97](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.96...v0.1.97) (2026-03-24)

### Detected changes
- root: .env.example
- .github: .github/workflows/deploy-api.yml
- docs: docs/deployment/api-aws.md
- packages: 3 changed file(s)
  - packages/api/.env.example
  - packages/api/src/db/client.test.ts
  - packages/api/src/db/client.ts


## [0.1.97](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.96...v0.1.97) (2026-03-24)





## [0.1.96](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.95...v0.1.96) (2026-03-24)

### Detected changes
- packages: 2 changed file(s)
  - packages/api/src/db/client.test.ts
  - packages/api/src/db/client.ts


## [0.1.96](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.95...v0.1.96) (2026-03-24)





## [0.1.95](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.94...v0.1.95) (2026-03-24)

### Detected changes
- packages: 2 changed file(s)
  - packages/api/src/index.ts
  - packages/api/src/security-testing.test.ts


## [0.1.95](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.94...v0.1.95) (2026-03-24)





## [0.1.94](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.93...v0.1.94) (2026-03-24)

### Detected changes
- packages: packages/api/vitest.config.ts


## [0.1.94](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.93...v0.1.94) (2026-03-24)





## [0.1.93](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.92...v0.1.93) (2026-03-24)

### Detected changes
- packages: 6 changed file(s)
  - packages/api/src/__tests__/device-auth.property.test.ts
  - packages/api/src/__tests__/enrollment.property.test.ts
  - packages/api/src/db/client.test.ts
  - packages/api/src/db/client.ts
  - packages/api/src/db/migrate.test.ts
  - packages/api/src/index.ts


## [0.1.93](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.92...v0.1.93) (2026-03-24)





## [0.1.92](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.91...v0.1.92) (2026-03-24)

### Detected changes
- .github: .github/workflows/deploy-api.yml


## [0.1.92](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.91...v0.1.92) (2026-03-24)





## [0.1.91](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.90...v0.1.91) (2026-03-24)

### Detected changes
- packages: 2 changed file(s)
  - packages/api/src/db/client.test.ts
  - packages/api/src/db/client.ts


## [0.1.91](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.90...v0.1.91) (2026-03-24)





## [0.1.90](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.89...v0.1.90) (2026-03-24)

### Detected changes
- No source changes were detected; this release only advances version metadata.


## [0.1.90](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.89...v0.1.90) (2026-03-24)





## [0.1.89](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.88...v0.1.89) (2026-03-24)

### Detected changes
- packages: 2 changed file(s)
  - packages/api/src/db/client.test.ts
  - packages/api/src/db/client.ts


## [0.1.89](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.88...v0.1.89) (2026-03-24)





## [0.1.88](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.87...v0.1.88) (2026-03-24)

### Detected changes
- docs: docs/deployment/api-aws.md
- packages: packages/infra/README.md


## [0.1.88](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.87...v0.1.88) (2026-03-24)





## [0.1.87](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.86...v0.1.87) (2026-03-24)

### Detected changes
- .github: .github/workflows/deploy-api.yml


## [0.1.87](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.86...v0.1.87) (2026-03-24)





## [0.1.86](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.85...v0.1.86) (2026-03-24)

### Detected changes
- No source changes were detected; this release only advances version metadata.


## [0.1.86](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.84...v0.1.86) (2026-03-24)


### Bug Fixes

* validate email with zod and i18n invalidEmail message ([3f90b0f](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/3f90b0faa78450947777a528afd9cfffbcd2d242))





## [0.1.85](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.84...v0.1.85) (2026-03-24)


### Bug Fixes

* validate email with zod and i18n invalidEmail message ([3f90b0f](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/3f90b0faa78450947777a528afd9cfffbcd2d242))





## [0.1.85](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.84...v0.1.85) (2026-03-24)


### Bug Fixes

* validate email with zod and i18n invalidEmail message ([3f90b0f](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/3f90b0faa78450947777a528afd9cfffbcd2d242))





## [0.1.84](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.83...v0.1.84) (2026-03-24)

### Detected changes
- infra: infra/docker/Dockerfile.api


## [0.1.84](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.83...v0.1.84) (2026-03-24)





## [0.1.83](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.82...v0.1.83) (2026-03-24)

### Detected changes
- root: .dockerignore
- .github: .github/workflows/deploy-api.yml
- infra: infra/docker/Dockerfile.api
- packages: packages/api/package.json


## [0.1.83](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.82...v0.1.83) (2026-03-24)





## [0.1.82](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.81...v0.1.82) (2026-03-24)

### Detected changes
- .github: .github/workflows/deploy-api.yml
- docs: docs/deployment/api-aws.md
- packages: 11 changed file(s)
  - packages/api/src/__tests__/auth-email.test.ts
  - packages/api/src/routes/auth-email.ts
  - packages/infra/README.md
  - packages/infra/infra.config.ts
  - packages/infra/src/config/ConfigManager.test.ts
  - packages/infra/src/config/ConfigManager.ts
  - packages/infra/src/deployers/ApiDeployer.test.ts
  - packages/infra/src/deployers/ApiDeployer.ts
  - packages/infra/src/deployers/apiRuntime.test.ts
  - packages/infra/src/deployers/apiRuntime.ts
  - packages/infra/src/types.ts


## [0.1.82](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.81...v0.1.82) (2026-03-24)





## [0.1.81](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.80...v0.1.81) (2026-03-24)

### Detected changes
- .github: .github/workflows/deploy-api.yml
- .husky: .husky/pre-commit
- packages: 3 changed file(s)
  - packages/infra/scripts/bootstrap-api.sh
  - packages/infra/src/logging/Logger.test.ts
  - packages/infra/src/logging/Logger.ts
- scripts: scripts/release.sh


## [0.1.81](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.80...v0.1.81) (2026-03-24)





## [0.1.80](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.79...v0.1.80) (2026-03-24)

### Detected changes
- infra: infra/docker/Dockerfile.api


## [0.1.80](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.79...v0.1.80) (2026-03-24)





## [0.1.79](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.78...v0.1.79) (2026-03-24)


### Bug Fixes

* **api:** add @cig/auth to Dockerfile and fix OTP email template path ([7f4a3c8](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/7f4a3c852656268d37e768aae162d6aff86f1563))





## [0.1.79](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.78...v0.1.79) (2026-03-24)


### Bug Fixes

* **api:** add @cig/auth to Dockerfile and fix OTP email template path ([7f4a3c8](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/7f4a3c852656268d37e768aae162d6aff86f1563))





## [0.1.78](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.77...v0.1.78) (2026-03-24)

### Detected changes
- .github: .github/workflows/deploy-api.yml
- infra: infra/docker/Dockerfile.api
- packages: 4 changed file(s)
  - packages/api/package.json
  - packages/config/package.json
  - packages/discovery/package.json
  - packages/graph/package.json


## [0.1.78](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.77...v0.1.78) (2026-03-24)





## [0.1.77](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.76...v0.1.77) (2026-03-24)

### Detected changes
- apps: 2 changed file(s)
  - apps/dashboard/public/runtime-version.json
  - apps/dashboard/public/sw.js
- packages: 2 changed file(s)
  - packages/api/src/integration.test.ts
  - packages/api/src/routes.ts
- scripts: scripts/release.sh


## [0.1.77](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.76...v0.1.77) (2026-03-24)





## [0.1.76](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.74...v0.1.76) (2026-03-24)


### Bug Fixes

* **deploy:** pin production API origin ([287a64c](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/287a64c34739c785342fd3c51716f01501cb0811))





## [0.1.76](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.74...v0.1.76) (2026-03-24)


### Bug Fixes

* **deploy:** pin production API origin ([287a64c](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/287a64c34739c785342fd3c51716f01501cb0811))





## [0.1.75](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.74...v0.1.75) (2026-03-24)





## [0.1.75](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.74...v0.1.75) (2026-03-24)





## [0.1.74](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.73...v0.1.74) (2026-03-24)





## [0.1.74](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.73...v0.1.74) (2026-03-24)





## [0.1.73](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.72...v0.1.73) (2026-03-24)





## [0.1.73](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.72...v0.1.73) (2026-03-24)





## [0.1.72](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.68...v0.1.72) (2026-03-24)


### Bug Fixes

* **api:** force clean TypeScript build for migrations ([6e7450e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/6e7450e83cb0c7e33f08382636ba01814935c32b))
* **graph:** run resource pagination queries serially ([0262732](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/02627324a7e6f53c284be6b1be72d61353d9ef80))
* **infra:** bootstrap API deploys safely on existing stages ([f92b641](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/f92b641e8e282795781615878f6b40366bcf0e86))
* **landing:** remove legacy pages router to fix Next export build for GH Pages ([723591a](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/723591a5857ddb92466af63fab4c74f9f5415b1f))


### Features

* **auth:** split OTP and magic-link flows, custom email templates, frontend integration ([1b6b16d](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/1b6b16d00dc817cf167b839715ef9dfd4b2dd64d))





## [0.1.72](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.68...v0.1.72) (2026-03-24)


### Bug Fixes

* **api:** force clean TypeScript build for migrations ([6e7450e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/6e7450e83cb0c7e33f08382636ba01814935c32b))
* **graph:** run resource pagination queries serially ([0262732](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/02627324a7e6f53c284be6b1be72d61353d9ef80))
* **infra:** bootstrap API deploys safely on existing stages ([f92b641](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/f92b641e8e282795781615878f6b40366bcf0e86))
* **landing:** remove legacy pages router to fix Next export build for GH Pages ([723591a](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/723591a5857ddb92466af63fab4c74f9f5415b1f))


### Features

* **auth:** split OTP and magic-link flows, custom email templates, frontend integration ([1b6b16d](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/1b6b16d00dc817cf167b839715ef9dfd4b2dd64d))





## [0.1.71](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.68...v0.1.71) (2026-03-24)


### Bug Fixes

* **api:** force clean TypeScript build for migrations ([6e7450e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/6e7450e83cb0c7e33f08382636ba01814935c32b))
* **graph:** run resource pagination queries serially ([0262732](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/02627324a7e6f53c284be6b1be72d61353d9ef80))
* **infra:** bootstrap API deploys safely on existing stages ([f92b641](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/f92b641e8e282795781615878f6b40366bcf0e86))
* **landing:** remove legacy pages router to fix Next export build for GH Pages ([723591a](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/723591a5857ddb92466af63fab4c74f9f5415b1f))


### Features

* **auth:** split OTP and magic-link flows, custom email templates, frontend integration ([1b6b16d](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/1b6b16d00dc817cf167b839715ef9dfd4b2dd64d))





## [0.1.69](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.68...v0.1.69) (2026-03-24)


### Bug Fixes

* **landing:** remove legacy pages router to fix Next export build for GH Pages ([723591a](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/723591a5857ddb92466af63fab4c74f9f5415b1f))





## [0.1.68](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.65...v0.1.68) (2026-03-24)


### Bug Fixes

* align node 22 runtime and api migration packaging ([6928976](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/69289764d47b0660eb064beff09c6c288fd372fc))
* **api:** backfill legacy Supabase users schema ([b95c064](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/b95c0649485414d8c3f50e9071ead7bae68b25ee))
* **api:** pass subnet outputs into runtime deploy ([3195db9](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/3195db9b0098ee7f3a70d405726ff2cdd10a4edd))
* **api:** source auth inputs from live tenant ([2382f7d](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/2382f7da2746404c3efbed0832f7e7f489b685a0))
* **api:** unify publish and deploy pipeline ([e58848b](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/e58848b5fb5172ed9df9214217edbd7f10a14311))
* **ci:** handle missing sst stage in bootstrap diff ([f659714](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/f659714ad7dd26c72170f97982b5baa1589d361f))
* **ci:** remove browser auth dependency from api image ([6d01ad8](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/6d01ad82e4367d55f0b89d2601747fddc74d5acd))
* **ci:** remove workflow package resolution assumptions ([f73ac73](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/f73ac73be473a1080c96d8ef420996368f344bfd))
* **ci:** skip bootstrap diff when SST stage is absent ([55c649f](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/55c649f0e09fcef7a6adbc372348f4d894d727ce))
* **config:** add node types for docker builds ([25f0595](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/25f05956abc71adcbcd59fb54180d13dad6ae09c))
* **iac:** break neo4j terraform cycle ([8aadde3](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/8aadde311268cf45738cb2d8d31dee088fa89ea0))
* **iac:** raise ec2 root volumes for al2023 snapshots ([ea363d0](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/ea363d03a0fe96658979a8ab68a7d09d40fc2c2a))
* **infra:** attach ecs execution role policy by arn ([1806e36](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/1806e360e6e75c2e630324ca47b9c4aa669244b3))
* **infra:** clear workflow env in config test ([b634afc](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/b634afc01c175734bb21f5f839ec53cb85fad8a9))
* **infra:** make ecr lifecycle policy valid ([62acc47](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/62acc478c9340adb543d1db9e03f20f85752175d))
* **infra:** make sst config loader-safe ([66d99ad](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/66d99ad3ad44b42e80fa596bf4254e4f602af1c3))
* **infra:** move aws defaults to us-east-2 ([d3f01e9](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/d3f01e901d93582432370d11ad1e597b28a25c4c))





## [0.1.68](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.65...v0.1.68) (2026-03-24)


### Bug Fixes

* align node 22 runtime and api migration packaging ([6928976](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/69289764d47b0660eb064beff09c6c288fd372fc))
* **api:** backfill legacy Supabase users schema ([b95c064](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/b95c0649485414d8c3f50e9071ead7bae68b25ee))
* **api:** pass subnet outputs into runtime deploy ([3195db9](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/3195db9b0098ee7f3a70d405726ff2cdd10a4edd))
* **api:** source auth inputs from live tenant ([2382f7d](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/2382f7da2746404c3efbed0832f7e7f489b685a0))
* **api:** unify publish and deploy pipeline ([e58848b](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/e58848b5fb5172ed9df9214217edbd7f10a14311))
* **ci:** handle missing sst stage in bootstrap diff ([f659714](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/f659714ad7dd26c72170f97982b5baa1589d361f))
* **ci:** remove browser auth dependency from api image ([6d01ad8](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/6d01ad82e4367d55f0b89d2601747fddc74d5acd))
* **ci:** remove workflow package resolution assumptions ([f73ac73](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/f73ac73be473a1080c96d8ef420996368f344bfd))
* **ci:** skip bootstrap diff when SST stage is absent ([55c649f](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/55c649f0e09fcef7a6adbc372348f4d894d727ce))
* **config:** add node types for docker builds ([25f0595](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/25f05956abc71adcbcd59fb54180d13dad6ae09c))
* **iac:** break neo4j terraform cycle ([8aadde3](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/8aadde311268cf45738cb2d8d31dee088fa89ea0))
* **iac:** raise ec2 root volumes for al2023 snapshots ([ea363d0](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/ea363d03a0fe96658979a8ab68a7d09d40fc2c2a))
* **infra:** attach ecs execution role policy by arn ([1806e36](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/1806e360e6e75c2e630324ca47b9c4aa669244b3))
* **infra:** clear workflow env in config test ([b634afc](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/b634afc01c175734bb21f5f839ec53cb85fad8a9))
* **infra:** make ecr lifecycle policy valid ([62acc47](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/62acc478c9340adb543d1db9e03f20f85752175d))
* **infra:** make sst config loader-safe ([66d99ad](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/66d99ad3ad44b42e80fa596bf4254e4f602af1c3))
* **infra:** move aws defaults to us-east-2 ([d3f01e9](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/d3f01e901d93582432370d11ad1e597b28a25c4c))





## [0.1.67](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.65...v0.1.67) (2026-03-24)


### Bug Fixes

* align node 22 runtime and api migration packaging ([6928976](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/69289764d47b0660eb064beff09c6c288fd372fc))
* **api:** backfill legacy Supabase users schema ([b95c064](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/b95c0649485414d8c3f50e9071ead7bae68b25ee))
* **api:** pass subnet outputs into runtime deploy ([3195db9](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/3195db9b0098ee7f3a70d405726ff2cdd10a4edd))
* **api:** source auth inputs from live tenant ([2382f7d](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/2382f7da2746404c3efbed0832f7e7f489b685a0))
* **api:** unify publish and deploy pipeline ([e58848b](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/e58848b5fb5172ed9df9214217edbd7f10a14311))
* **ci:** handle missing sst stage in bootstrap diff ([f659714](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/f659714ad7dd26c72170f97982b5baa1589d361f))
* **ci:** remove browser auth dependency from api image ([6d01ad8](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/6d01ad82e4367d55f0b89d2601747fddc74d5acd))
* **ci:** remove workflow package resolution assumptions ([f73ac73](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/f73ac73be473a1080c96d8ef420996368f344bfd))
* **ci:** skip bootstrap diff when SST stage is absent ([55c649f](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/55c649f0e09fcef7a6adbc372348f4d894d727ce))
* **config:** add node types for docker builds ([25f0595](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/25f05956abc71adcbcd59fb54180d13dad6ae09c))
* **iac:** break neo4j terraform cycle ([8aadde3](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/8aadde311268cf45738cb2d8d31dee088fa89ea0))
* **iac:** raise ec2 root volumes for al2023 snapshots ([ea363d0](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/ea363d03a0fe96658979a8ab68a7d09d40fc2c2a))
* **infra:** attach ecs execution role policy by arn ([1806e36](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/1806e360e6e75c2e630324ca47b9c4aa669244b3))
* **infra:** clear workflow env in config test ([b634afc](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/b634afc01c175734bb21f5f839ec53cb85fad8a9))
* **infra:** make ecr lifecycle policy valid ([62acc47](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/62acc478c9340adb543d1db9e03f20f85752175d))
* **infra:** make sst config loader-safe ([66d99ad](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/66d99ad3ad44b42e80fa596bf4254e4f602af1c3))
* **infra:** move aws defaults to us-east-2 ([d3f01e9](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/d3f01e901d93582432370d11ad1e597b28a25c4c))





## [0.1.66](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.65...v0.1.66) (2026-03-24)





## [0.1.65](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.64...v0.1.65) (2026-03-24)


### Bug Fixes

* **dashboard:** include sdk in container build ([0365213](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/0365213aa8618f166a30218a840c6f315bc306b7))





## [0.1.65](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.64...v0.1.65) (2026-03-24)


### Bug Fixes

* **dashboard:** include sdk in container build ([0365213](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/0365213aa8618f166a30218a840c6f315bc306b7))





## [0.1.64](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.63...v0.1.64) (2026-03-24)


### Bug Fixes

* **api:** add explicit logout route rate-limit config ([775b147](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/775b14752dd4ebd3c831503faefcc4843d10161c))
* **api:** harden logout auth and unblock PR9 lint checks ([e8c9720](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/e8c972070896ec4d2022a04b393b8a52ba0ca87e))
* **api:** relax logout auth gate and keep explicit rate-limit metadata ([a0d441d](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/a0d441dfd0686dc02c0af03d0f059a55546dbc9a))
* **api:** use codeql-modeled fastify rate limiter on logout ([d0cead0](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/d0cead01efcbc16d0cefa4be20dad779b94cd842))
* **release:** ignore build metadata tags in prod workflows ([04c3a7e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/04c3a7e349e8f95a7ac92d20b2297708280253f6))


### Features

* **api:** add token refresh endpoint and coverage ([4cdc329](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/4cdc329551fd39e5d2b2047a7604eb5514bce246))





## [0.1.63](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.62...v0.1.63) (2026-03-24)





## [0.1.63](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.62...v0.1.63) (2026-03-24)





## [0.1.62](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.61...v0.1.62) (2026-03-24)





## [0.1.62](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.61...v0.1.62) (2026-03-24)





## [0.1.61](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.60...v0.1.61) (2026-03-24)





## [0.1.61](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.60...v0.1.61) (2026-03-24)





## [0.1.60](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.59...v0.1.60) (2026-03-24)





## [0.1.60](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.59...v0.1.60) (2026-03-24)





## [0.1.59](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.58...v0.1.59) (2026-03-24)





## [0.1.59](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.58...v0.1.59) (2026-03-24)





## [0.1.58](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.57...v0.1.58) (2026-03-23)


### Features

* **dashboard:** unify device management page ([b2b69e1](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/b2b69e1090c478520ea78a0975e153c650da7d0a))





## [0.1.58](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.57...v0.1.58) (2026-03-23)


### Features

* **dashboard:** unify device management page ([b2b69e1](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/b2b69e1090c478520ea78a0975e153c650da7d0a))





## [0.1.57](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.54...v0.1.57) (2026-03-23)


### Bug Fixes

* **env:** redact secrets and obfuscate false positives ([1f506be](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/1f506be486248e9071d1823095146325bbbcf15e))





## [0.1.57](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.54...v0.1.57) (2026-03-23)


### Bug Fixes

* **env:** redact secrets and obfuscate false positives ([1f506be](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/1f506be486248e9071d1823095146325bbbcf15e))





## [0.1.56](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.54...v0.1.56) (2026-03-23)


### Bug Fixes

* **env:** redact secrets and obfuscate false positives ([1f506be](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/1f506be486248e9071d1823095146325bbbcf15e))





## [0.1.56](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.54...v0.1.56) (2026-03-23)


### Bug Fixes

* **env:** redact secrets and obfuscate false positives ([1f506be](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/1f506be486248e9071d1823095146325bbbcf15e))





## [0.1.55](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.54...v0.1.55) (2026-03-23)


### Bug Fixes

* **env:** redact secrets and obfuscate false positives ([1f506be](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/1f506be486248e9071d1823095146325bbbcf15e))





## [0.1.55](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.54...v0.1.55) (2026-03-23)


### Bug Fixes

* **env:** redact secrets and obfuscate false positives ([1f506be](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/1f506be486248e9071d1823095146325bbbcf15e))





## [0.1.54](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.53...v0.1.54) (2026-03-23)





## [0.1.54](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.53...v0.1.54) (2026-03-23)





## [0.1.53](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.52...v0.1.53) (2026-03-23)


### Features

* Authentik OIDC hardening, device session persistence, dashboard devices page, cartography scan service ([#7](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/issues/7)) ([5835322](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/58353226f65416b77f07868a0a932427c0f3c9b1))





## [0.1.53](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.52...v0.1.53) (2026-03-23)


### Features

* Authentik OIDC hardening, device session persistence, dashboard devices page, cartography scan service ([#7](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/issues/7)) ([5835322](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/58353226f65416b77f07868a0a932427c0f3c9b1))





## [0.1.52](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.51...v0.1.52) (2026-03-23)





## [0.1.52](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.51...v0.1.52) (2026-03-23)





## [0.1.51](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.50...v0.1.51) (2026-03-23)





## [0.1.51](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.50...v0.1.51) (2026-03-23)





## [0.1.50](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.49...v0.1.50) (2026-03-23)





## [0.1.50](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.49...v0.1.50) (2026-03-23)





## [0.1.49](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.48...v0.1.49) (2026-03-23)





## [0.1.49](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.48...v0.1.49) (2026-03-23)





## [0.1.48](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.47...v0.1.48) (2026-03-23)





## [0.1.48](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.47...v0.1.48) (2026-03-23)





## [0.1.47](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.46...v0.1.47) (2026-03-23)





## [0.1.47](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.46...v0.1.47) (2026-03-23)





## [0.1.46](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.45...v0.1.46) (2026-03-23)





## [0.1.46](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.45...v0.1.46) (2026-03-23)





## [0.1.45](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.44...v0.1.45) (2026-03-23)





## [0.1.45](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.44...v0.1.45) (2026-03-23)





## [0.1.44](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.43...v0.1.44) (2026-03-23)





## [0.1.44](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.43...v0.1.44) (2026-03-23)





## [0.1.43](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.42...v0.1.43) (2026-03-23)





## [0.1.43](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.42...v0.1.43) (2026-03-23)





## [0.1.42](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.41...v0.1.42) (2026-03-22)





## [0.1.42](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.41...v0.1.42) (2026-03-22)





## [0.1.41](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.40...v0.1.41) (2026-03-22)





## [0.1.41](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.40...v0.1.41) (2026-03-22)





## [0.1.40](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.39...v0.1.40) (2026-03-22)


### Bug Fixes

* **auth:** fully end Authentik browser sessions on logout ([69cb692](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/69cb69262123a5c6ed2fddf88d6d03986a52a60e))





## [0.1.40](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.39...v0.1.40) (2026-03-22)


### Bug Fixes

* **auth:** fully end Authentik browser sessions on logout ([69cb692](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/69cb69262123a5c6ed2fddf88d6d03986a52a60e))





## [0.1.39](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.38...v0.1.39) (2026-03-22)


### Bug Fixes

* **release:** validate dashboard container build ([2e1220b](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/2e1220b4b1bebcbf4ac438c7307bc572124383c4))





## [0.1.39](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.38...v0.1.39) (2026-03-22)


### Bug Fixes

* **release:** validate dashboard container build ([2e1220b](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/2e1220b4b1bebcbf4ac438c7307bc572124383c4))





## [0.1.38](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.37...v0.1.38) (2026-03-22)


### Features

* **auth:** add Authentik PKCE social login flow ([3f877bd](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/3f877bdf6826fc7e0cae814fce23d793a9d6cd54))





## [0.1.38](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.37...v0.1.38) (2026-03-22)


### Features

* **auth:** add Authentik PKCE social login flow ([3f877bd](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/3f877bdf6826fc7e0cae814fce23d793a9d6cd54))





## [0.1.37](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.36...v0.1.37) (2026-03-22)


### Features

* **cli:** prepare first public npm release ([c013c75](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/c013c75075cea9e93e42926d81f3a4798c409053))
* **iac:** provision auth.cig.technology Authentik SSO on AWS ([0b750ed](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/0b750ed148e706f510dc8cdf0b54876302c32e1e))





## [0.1.37](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.36...v0.1.37) (2026-03-22)


### Features

* **cli:** prepare first public npm release ([c013c75](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/c013c75075cea9e93e42926d81f3a4798c409053))
* **iac:** provision auth.cig.technology Authentik SSO on AWS ([0b750ed](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/0b750ed148e706f510dc8cdf0b54876302c32e1e))





## [0.1.36](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.35...v0.1.36) (2026-03-21)





## [0.1.36](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.35...v0.1.36) (2026-03-21)





## [0.1.35](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.34...v0.1.35) (2026-03-21)





## [0.1.35](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.34...v0.1.35) (2026-03-21)





## [0.1.34](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.33...v0.1.34) (2026-03-21)





## [0.1.34](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.33...v0.1.34) (2026-03-21)





## [0.1.34](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.33...v0.1.34) (2026-03-21)





## [0.1.34](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.33...v0.1.34) (2026-03-21)





## [0.1.33](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.32...v0.1.33) (2026-03-21)


### Bug Fixes

* **docs:** remove duplicate changelog entries; sync all workspace package versions to 0.1.33



## [0.1.32](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.31...v0.1.32) (2026-03-21)

### Bug Fixes

* **docker:** add packages/i18n to dashboard Dockerfile build context ([8a2645c](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/8a2645cc33dbe32857e8e3ed86571b5553a9170c))


## [0.1.31](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.30...v0.1.31) (2026-03-21)

### Features

* **dashboard:** collapsible sidebar sections (Platform, Operations, Account) with smooth CSS grid animation ([f55db3f](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/f55db3fa))
* **dashboard:** new Operations section grouping Device Approval, Targets, and Bootstrap nav items ([f55db3f](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/f55db3fa))
* **dashboard:** integrate @cig-technology/i18n with full EN/ES/ZH internationalization ([f55db3f](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/f55db3fa))
* **dashboard:** add LocaleSwitcher component with globe icon and dropdown ([f55db3f](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/f55db3fa))
* **i18n:** expand dashboard catalog to ~200 keys across sidebar, nav, header, pages, and footer namespaces ([f55db3f](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/f55db3fa))

### Bug Fixes

* **dashboard:** replace Resources icon (cube-transparent) and Graph icon (share/nodes) with better representations ([f55db3f](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/f55db3fa))

## [0.1.30](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.29+build.8...v0.1.30) (2026-03-21)

### Bug Fixes

* **ci:** sanitize Docker tag by replacing '+' with '-' in release tags ([bd246f3](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/bd246f3cd3b6559972f79f844fb2117753e23c38))
* **landing:** defer pointer capture until drag threshold crossed ([bd81fb8](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/bd81fb8b51bee9e571a11a18d20e36530db239be))

### Features

* **dashboard:** redesign UI with CIG dark theme, add Targets & Bootstrap pages ([4aeaa0f](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/4aeaa0f840dd059745d8947d281a1c3f75ad0483)), closes [#050b14](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/issues/050b14)
* **landing:** simplify HoloCard to click-opens-modal, hover reveals content ([4eb9a4a](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/4eb9a4a8682e5e52a436eb9f035d01390738c12e))

## [0.1.29](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.28...v0.1.29) (2026-03-21)

### Bug Fixes

* **landing:** only scale card on selection, not on hover ([0ef70d1](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/0ef70d1afa7282fb54f2e2bd4cd0789d4a3d7653))

## [0.1.28](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.27...v0.1.28) (2026-03-21)

### Bug Fixes

* **dashboard:** server-side auth guard + card height expansion ([63f4672](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/63f4672eccad85abfd4f60ade9c47db941e95b2d))

## [0.1.27](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.26...v0.1.27) (2026-03-21)

### Bug Fixes

* **dashboard:** redirect unauthenticated users to landing sign-in ([4e66e7f](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/4e66e7fb83f38a93bde02f7a1934a3e06874be0b))
* **infra:** add apps/dashboard/public dir so Dockerfile COPY doesn't fail ([1dc12c5](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/1dc12c547e88ccfad8513a6a407413e862b8e7d3))
* **infra:** use --ignore-not-found for optional public/ COPY in Dockerfile ([2cb2ea6](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/2cb2ea69bbf0653d9ff762047964cc677ec2a03e))

### Features

* **landing:** add 'Know more' CTA and feature detail modal to HoloCards ([1a33b8b](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/1a33b8b23b70af5d666c732b8b4ad86d1833f901))

## [0.1.26](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.25...v0.1.26) (2026-03-21)

### Features

* **infra:** add GCP Cloud Run provider + Workload Identity Federation ([910f60f](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/910f60fc4ba09ea9bf24a9b13ad74b1ed2e87a9a))

## [0.1.25](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.24...v0.1.25) (2026-03-21)

### Features

* **infra:** add Cloud Run CI/CD pipeline for app.cig.lat dashboard ([3106fa0](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/3106fa0b17ced44f6232882c4ceb4289db4ef9ae))

## [0.1.24](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.23...v0.1.24) (2026-03-21)

## [0.1.23](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.22...v0.1.23) (2026-03-21)

### Bug Fixes

* **dashboard/graph:** resolve infinite re-render loop + react-doctor improvements ([63d9510](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/63d951074cf0b72f0404185df4c5324f8ac3ebdc))

### Features

* **auth:** proper logout flow with shared SignedOut page ([9c1530a](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/9c1530a08efa6b26b3b2bb267d5c67f62296b09d))
* **dashboard:** integrate Refine framework with profile, settings, notifications, and logout ([db78ed3](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/db78ed33515d68c3e4f9022b04ffdf79eaab2dce))

## [0.1.22](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.21...v0.1.22) (2026-03-21)

### Features

* **landing:** add DitheringShader WebGL effect to footer background ([d0d5ad6](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/d0d5ad6c64a238032a309b2893708ebde785666e))

## [0.1.21](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.20...v0.1.21) (2026-03-21)

### Bug Fixes

* **landing:** move FallingPattern from public landing to authenticated landing ([64e6d36](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/64e6d3682b3a47881e5f11d705a126f42a83edd8))

## [0.1.20](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.19...v0.1.20) (2026-03-21)

### Bug Fixes

* **landing:** FallingPattern light mode only, blob glows both modes ([a98d402](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/a98d402621fdea52f9030520ec5e49e906c20b7d))

## [0.1.19](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.18...v0.1.19) (2026-03-21)

### Features

* **landing:** add FallingPattern light-mode background animation ([47eede3](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/47eede34d900535e05e26d91f1d10f9362403fd3))

## [0.1.18](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.17...v0.1.18) (2026-03-21)

### Features

* **i18n:** integrate @cig-technology/i18n into landing app ([67e2659](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/67e2659d02eae91f30009ebe2e86401425f54585))

## [0.1.17](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.16...v0.1.17) (2026-03-21)

### Bug Fixes

* improve landing card contrast and infra path handling ([565f335](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/565f33535e1e2bfc65082990824cef406c85dc57))

## [0.1.16](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.15...v0.1.16) (2026-03-21)

### Bug Fixes

* **ci:** remove explicit pnpm version to avoid conflict with packageManager ([c8d1c0c](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/c8d1c0c9e73647dea67277a03d53bb32befa6fa3))
* **i18n:** correct repository URL for npm provenance verification ([2704b3e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/2704b3e328ba364e593a13ccaf1f6a96ef7cd1e4))

### Features

* **i18n:** add @cig-technology/i18n v1.0.0 standalone i18n package ([c4b980a](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/c4b980ad9a66a7f5fe1e3b4be00b5d4d198c2123))
* **landing:** add full light/dark mode support with ThemeToggle ([805089e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/805089ecba62d6a5b2488f5706326d50c69553aa))

## [0.1.15](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.14...v0.1.15) (2026-03-20)

### Bug Fixes

* **auth:** always pass explicit redirectUri in OAuth handlers ([1129e2d](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/1129e2dd20d36bdc8cdf7c8920cbf755c89202ab))

## [0.1.14](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.13...v0.1.14) (2026-03-20)

### Bug Fixes

* **landing:** wire Google/GitHub OAuth in SignInButtonOnly ([4b411d5](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/4b411d56031f6aa3a3e0482fab37d81abd1daf8f))

## [0.1.13](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.12...v0.1.13) (2026-03-20)

### Bug Fixes

* **landing:** always show sign-in button even without Supabase client ([f78235a](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/f78235ace651bf6c49ee6831f426d6bff73feb19))

## [0.1.12](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.11...v0.1.12) (2026-03-20)

### Bug Fixes

* **auth:** add useAuthAvailable to fully guard useAuth() calls ([8cef38f](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/8cef38f0fa92a218d3855ae1aeb5b67a33a87c2b))

## [0.1.11](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.10...v0.1.11) (2026-03-20)

### Bug Fixes

* **auth:** fix useAuth called outside AuthProvider on missing Supabase env vars ([6026724](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/6026724ab1c0c29c0f6546d220dfeb27bbfd2b79))

## [0.1.10](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.9...v0.1.10) (2026-03-20)

### Bug Fixes

* **landing:** fix black screen on cig.lat, add concurrently colors ([0006cb1](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/0006cb17f506a11d538c2376d767aa1e835b45e5))

## [0.1.9](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.8...v0.1.9) (2026-03-20)

### Bug Fixes

* **deps:** add @cig/ui workspace dep to dashboard and wizard-ui; add tailwindcss to wizard-ui ([b8dc105](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/b8dc10531a5b6b0b8a2652825bcbf3d72e63a4a9))
* **landing:** add @cig/ui dep, add build gate to release script ([5d68889](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/5d68889a6b26b7855a67193ee4d4dd76f1a0edb7))

## [0.1.8](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.7...v0.1.8) (2026-03-20)

### Bug Fixes

* **landing:** show authenticated landing for logged-in users, fix build errors ([43089c4](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/43089c4f3b9c07dfab0d5fc3c0baadbcd2adde6d))

## [0.1.7](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.6...v0.1.7) (2026-03-19)

### Features

* **newsletter:** add email subscription with Supabase persistence ([3c06872](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/3c06872922a98e1935e4493873f2ab3c92c3909f))
* **ui:** add @cig/ui design system with glass morphism theme ([f67a887](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/f67a887348c9fcc35d279c7b4430df1bad88c123))

## [0.1.6](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.5...v0.1.6) (2026-03-19)

## [0.1.5](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.4...v0.1.5) (2026-03-19)

## [0.1.4](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/compare/v0.1.3+build.2...v0.1.4) (2026-03-19)
## 0.1.3 (2026-03-19)

### Bug Fixes

* **landing:** add basePath/assetPrefix for GitHub Pages subpath deployment ([7a03216](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/7a03216b5dfd3c1e60b6754903ed7c4b6e51c5eb))
* resolve lint failures across all workspace packages ([cff4945](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/cff49457b02415d9e10c9b1e0520bb2dfc8105e3))
* resolve remaining type errors in chatbot and api packages ([2cfb206](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/2cfb2062f67400bce997ab0c89b7a99c8d443d7c))
* **sdk:** pass with no tests until sdk is implemented ([89a6915](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/89a691545b725ce1a53e96aacd95c59b50e797b4))
* set cig.lat as primary domain and keep legacy fallback ([621aa54](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/621aa54e3172664bc9620838123393078ea878b3))
* update pnpm version to 9 in deploy-landing workflow ([3c064ba](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/3c064baaf0a780f477770082f5a9719e27294159))

### Features

* **auth:** add @cig/auth package with Supabase OAuth + multi-method sign-in modal ([598d8e6](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/598d8e6a908a8d143a5ad25fe92a41e05b1b178b))
* display app version from root package.json in all app footers ([53c6dd6](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/53c6dd6f3d18e23b34642b2dbc5b817129b3c90d))
* **infra:** add @cig/infra deployment wrapper package v0.1.2 ([8a65090](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/8a65090914f59e95f3ee2bde964aa662eb9fe888))
* **landing:** add CIG favicon, manifest PNGs, inline SVG icon, fix themeColor viewport ([9b8741b](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/9b8741ba5db1cdaa081ba194798a6834f70b66e6))
* **landing:** add cursor-driven graph-particle 'CIG' typography to hero section ([50a7beb](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/50a7beb9d7d82a1352d7a409952c2c8dbfea030b))
* **landing:** add space particle animation behind CIG text, enlarge canvas ([b5a11bd](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/b5a11bdec14e6b353f594bec03a5cf40670fd5f9))
* **landing:** animated hero icon+title sequence (Compute→Intelligence→Graph→CIG) ([2876ad8](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/2876ad85cffb2d994cd455c856979bc90e0be602))
* **landing:** loop hero icon+title animation infinitely ([008f94e](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/008f94e7e34f6d5257a8f97a307ddc2746d07dee))
* **landing:** upgrade landing page with scroll animations, back-to-top, and release script ([2e3cd9d](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/2e3cd9d25952e3403fa8c1d4255f89011f67b945))
* upgrade to @edcalderon/versioning v1.4.7 with workspace-scripts ([b6a8bdf](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/b6a8bdfc0e176234791ee5645987238139a57b43))

## [0.1.2] - 2026-03-18

### Features

* **infra:** add `@cig/infra` deployment wrapper package — ConfigManager, Logger, InfraWrapper, IACIntegration, AuthentikDeployer, DashboardDeployer, CLI entry point, full error hierarchy, 37+ tests ([8a65090](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/8a65090914f59e95f3ee2bde964aa662eb9fe888))
* **auth:** add `@cig/auth` package with Supabase OAuth + multi-method sign-in modal ([598d8e6](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/598d8e6a908a8d143a5ad25fe92a41e05b1b178b))
* display app version from root package.json in all app footers ([53c6dd6](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/53c6dd6f3d18e23b34642b2dbc5b817129b3c90d))
* upgrade to @edcalderon/versioning v1.4.7 with workspace-scripts ([b6a8bdf](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/b6a8bdfc0e176234791ee5645987238139a57b43))
* **landing:** animated hero sequence, space particles, cursor-driven graph typography, scroll animations ([2e3cd9d](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/2e3cd9d25952e3403fa8c1d4255f89011f67b945))
* **landing:** add CIG favicon, manifest PNGs, inline SVG icon ([9b8741b](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/9b8741ba5db1cdaa081ba194798a6834f70b66e6))

### Bug Fixes

* resolve lint failures across all workspace packages ([cff4945](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/cff49457b02415d9e10c9b1e0520bb2dfc8105e3))
* resolve remaining type errors in chatbot and api packages ([2cfb206](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/2cfb2062f67400bce997ab0c89b7a99c8d443d7c))
* **landing:** add basePath/assetPrefix for GitHub Pages subpath deployment ([7a03216](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/7a03216b5dfd3c1e60b6754903ed7c4b6e51c5eb))
* set cig.lat as primary domain and keep legacy fallback ([621aa54](https://github.com/CIG-TECHNOLOGY/ComputeIntelligenceGraph/commit/621aa54e3172664bc9620838123393078ea878b3))

## [0.1.1] - 2026-03-16

### Features

* initial monorepo setup with pnpm + TurboRepo
* Neo4j graph engine with traversal, circular dependency detection, 61 unit tests
* Fastify API with REST, GraphQL, WebSocket, auth, rate limiting, 108 tests
* Next.js 14 dashboard with resource views, graph visualization, costs, security, 37+ E2E tests
* Python Cartography discovery service + TypeScript orchestrator
