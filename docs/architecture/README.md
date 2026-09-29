# Architecture Notes

Last synchronized with the root README and release state on `2026-03-29`.

## Foundation Decisions

- `packages/api` is the single canonical domain API for CIG. New business endpoints, validation, auth enforcement, metrics, and persistence boundaries belong there.
- `apps/dashboard` is the protected application shell. Internal Next.js routes are allowed only for browser-specific concerns such as session bridging, auth relays, and server-only web integrations.
- `packages/sdk` is the shared typed client contract for dashboard and CLI. Client-side consumers should converge on it instead of creating new raw `fetch` helpers per surface.
- `https://api.cig.technology` is the target canonical public API origin for production provisioning on AWS.
- `packages/iac` owns stateful API core data on AWS.
- `packages/infra` owns the AWS runtime stack and deployment orchestration for the API.
- GitHub Actions is the primary production deployment mechanism; native SST pipelines are optional follow-up infrastructure and remain disabled by default.

## Current Runtime Roles

| Area | Path | Current role |
| --- | --- | --- |
| Landing | `apps/landing` | Public site, login entrypoint, and canonical logout return surface |
| Dashboard | `apps/dashboard` | Main protected Next.js dashboard UI |
| API | `packages/api` | Fastify REST, GraphQL, WebSocket, auth, and metrics |
| Graph engine | `packages/graph` | Neo4j-backed graph modeling and traversal |
| Discovery | `packages/discovery` | Discovery orchestration and scheduler |
| Cartography service | `services/cartography` | Python discovery worker/service |
| Chatbot | `packages/chatbot` | Retrieval and RAG pipeline |
| Agents | `packages/agents` | Query reasoning and action workflows |
| CLI | `packages/cli` | Install, connect, bootstrap, enroll, and operator commands |
| Auth helpers | `packages/auth` | Shared authentication/session helpers |
| Infra wrapper | `packages/infra` | Deployment wrapper around infrastructure tooling |

## Supporting Packages

These packages are part of the active repository shape even if they are not the primary end-user entrypoints:

- `packages/config` for configuration loading and validation
- `packages/i18n` for translations and localization utilities
- `packages/ui` for shared UI primitives
- `packages/node-runtime` for node runtime assets
- `packages/runtime-contracts` for shared runtime contracts
- `packages/iac` for Terraform modules and environment layouts

## Areas Still Evolving

- `apps/wizard-ui` is still a minimal placeholder
- `packages/sdk` is now the foundation for a shared typed client, but it is still incomplete relative to the full API surface
- Deployment and operator flows are more mature than the wizard surface

## High-Level Layout

```text
Landing (cig.lat) -> Dashboard auth relay / login callback -> Authentik
Landing / Dashboard / CLI -> SDK client layer -> API -> Graph / Discovery / Chatbot / Agents
Dashboard internal routes -> browser/session/auth bridge only
                                 -> Neo4j
                                 -> Chroma
Discovery orchestration -> Cartography -> Cloud providers
CLI -> local config / enrollment / install assets / compose workflows
packages/iac -> AWS networking / Neo4j core data
packages/infra -> ECS/Fargate runtime / ALB / DNS / deploy orchestration
```

## Implementation Boundary Rules

- Add or change business endpoints in `packages/api` first.
- Add typed request/response support in `packages/sdk` second.
- Consume those SDK methods from `apps/dashboard` and `packages/cli` instead of introducing new domain-specific `fetch` utilities.
- Keep dashboard `app/api/*` routes narrow. If a route can live in the standalone API, it should.

## Optional Follow-Up

`packages/sdk` can later grow beyond transport helpers into a higher-level CIG domain client that composes common workflows for dashboard, CLI, and future automation surfaces. The boundary to keep intact is that authoritative validation, permission checks, and write-side business rules still stay in `packages/api`.

## Related Docs

- Status snapshot: [../../PROJECT_STATUS.md](../../PROJECT_STATUS.md)
- Development notes: [../development/README.md](../development/README.md)
- Deployment notes: [../deployment/README.md](../deployment/README.md)
- Authentication notes: [../authentication/README.md](../authentication/README.md)
- Archived blueprint material: [../archive/CIG_final_blueprint.md](../archive/CIG_final_blueprint.md)
- CLI/runtime implementation snapshot: [cli-current-state.md](cli-current-state.md)
- Analytics SaaS foundation decisions: [umami-analytics-saas-foundation.md](umami-analytics-saas-foundation.md)
- Analytics MVP operations: [../analytics/README.md](../analytics/README.md)

Use the implementation in `apps/`, `packages/`, `services/`, and `infra/` as the source of truth when documents drift.
