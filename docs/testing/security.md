# Security Testing — CIG API

## Overview

This document describes the security testing strategy for the CIG API layer, covering automated tests, external scanning tools, known security controls, and remediation guidance.

---

## Automated Security Tests

File: `packages/api/src/security-testing.test.ts`

Run with:

```bash
pnpm --filter @cig/api test
```

### Test Coverage

| Category | Tests | What is verified |
|---|---|---|
| Authentication bypass | 13 | Every protected endpoint returns 401 with no auth header |
| Malformed auth headers | 5 | `Bearer` with no token, `Basic` scheme, empty/whitespace, missing prefix |
| JWT tampering | 5 | Tampered payload, wrong secret, `alg:none` attack, truncated token, invalid string |
| Cypher injection | 14 | Write/destructive keywords (`CREATE`, `DELETE`, `MERGE`, `SET`, `DROP`, etc.) are blocked; valid `MATCH`/`CALL`/`WITH` queries are allowed |
| XSS in query params | 9 | Script tags, event handlers, template injection — server never returns 500 and always responds with JSON |
| Rate limiting | 3 | 429 after 100 req/min, `Retry-After` header present, per-client isolation |
| Authorization | 3 | 403 for missing permissions, ADMIN grants full access |

---

## Container Vulnerability Scanning (Trivy)

Trivy scans Docker images for OS and library CVEs.

**Install:**

```bash
brew install aquasecurity/trivy/trivy   # macOS
# or
curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh
```

**Scan the API image:**

```bash
docker build -f packages/infra/docker/Dockerfile.api -t cig-api:latest .
trivy image cig-api:latest
```

**Scan all CIG images:**

```bash
trivy image cig-api:latest
trivy image cig-dashboard:latest
trivy image cig-chatbot:latest
trivy image cig-discovery:latest
```

**Recommended flags for CI:**

```bash
trivy image --exit-code 1 --severity CRITICAL,HIGH cig-api:latest
```

This fails the build on any CRITICAL or HIGH CVE.

---

## Dependency Vulnerability Scanning (npm audit)

```bash
# From the workspace root
pnpm audit

# Audit a specific package
pnpm --filter @cig/api audit

# Auto-fix non-breaking vulnerabilities
pnpm audit --fix
```

Integrate in CI by adding `pnpm audit --audit-level=high` as a required step — this exits non-zero on HIGH or CRITICAL findings.

---

## Static Application Security Testing (SAST) — CodeQL

CIG uses GitHub Actions for CodeQL analysis. Reference workflow:

```yaml
# .github/workflows/codeql.yml
name: CodeQL

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 2 * * 1'   # weekly on Monday

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript
      - uses: github/codeql-action/autobuild@v3
      - uses: github/codeql-action/analyze@v3
```

Results appear in the GitHub Security tab under "Code scanning alerts".

---

## Known Security Controls

### Authentication

- All API endpoints (except `/api/v1/health` and `/metrics`) require authentication.
- Supported schemes: `Bearer <JWT>` and `X-API-Key: <key>`.
- JWTs are signed with HS256 using `JWT_SECRET` (24h expiry).
- API keys are stored as bcrypt hashes (10 rounds); plaintext keys are never persisted.

### Authorization

- Role-based via `Permission` enum: `READ_RESOURCES`, `WRITE_RESOURCES`, `EXECUTE_ACTIONS`, `MANAGE_DISCOVERY`, `ADMIN`.
- `ADMIN` grants access to all endpoints.
- Insufficient permissions return 403.

### Cypher Injection Prevention

- `POST /api/v1/graph/query` only accepts queries starting with `MATCH`, `CALL`, or `WITH`.
- Queries containing write keywords (`CREATE`, `MERGE`, `DELETE`, `DETACH`, `SET`, `REMOVE`, `DROP`, `FOREACH`) are rejected with 400 regardless of prefix.

### Rate Limiting

- 100 requests per minute per client (keyed by `X-API-Key` header or IP address).
- Exceeding the limit returns 429 with a `Retry-After` header.

### Transport Security

- CORS is configured via `CORS_ORIGINS` environment variable (defaults to `*` in development; restrict in production).
- All production traffic should be served over HTTPS via a reverse proxy or load balancer.

---

## Remediation Guidance

### Critical / High CVEs (Trivy)

1. Update the base image in `packages/infra/docker/Dockerfile.api` to the latest patch version.
2. Run `pnpm update <package>` for affected npm dependencies.
3. If no fix is available, evaluate whether the vulnerable code path is reachable and apply a compensating control.

### npm audit findings

- Run `pnpm audit --fix` for automatic safe upgrades.
- For breaking changes, review the changelog and update manually.
- Use `pnpm audit --audit-level=moderate` locally; use `--audit-level=high` in CI gates.

### JWT Secret Rotation

- Set `JWT_SECRET` to a cryptographically random value of at least 256 bits.
- Rotate the secret by updating the environment variable and redeploying; existing tokens will be invalidated immediately.

### CORS Hardening

- In production, set `CORS_ORIGINS` to the exact dashboard origin (e.g., `https://dashboard.example.com`).
- Never use `*` in production.

### Rate Limit Bypass

- The current rate limiter trusts the `request.ip` value from Fastify. Ensure the API is behind a trusted reverse proxy and that `trustProxy` is configured correctly to prevent IP spoofing via `X-Forwarded-For`.

### Cypher Injection (Defense in Depth)

- The keyword blocklist is a first line of defense. For full protection, use parameterized queries via the Neo4j driver rather than string interpolation.
- Never expose raw Cypher execution to untrusted input without parameterization.
