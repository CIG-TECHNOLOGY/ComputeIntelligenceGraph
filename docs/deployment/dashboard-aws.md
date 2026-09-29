# Dashboard on AWS ECS

The production dashboard is an immutable Next.js container running in the
existing AWS ECS/Fargate cluster in `us-east-2`.

| Surface | AWS resource |
| --- | --- |
| Public URL | `https://app.cig.lat` |
| ECS cluster | `cig-api-production-cluster` |
| ECS service | `cig-dashboard-production-service` |
| Task family | `cig-dashboard-production` |
| Container | `dashboard:3000` |
| Registry | ECR repository `cig-dashboard-production` |
| Edge | Internet-facing ALB `cig-dashboard-production-alb` |

## Delivery

The authoritative workflow is
`.github/workflows/deploy-dashboard.yml`. It uses GitHub OIDC to assume the
AWS `github-actions-role`, builds `packages/infra/docker/Dockerfile.dashboard`,
pushes an immutable ECR tag, registers a new ECS task definition, waits for
service stability, and smoke-tests both the dashboard and
`/runtime-version.json`.

The dashboard receives runtime-only Supabase and Authentik secret references
from AWS Secrets Manager. `NEXT_PUBLIC_*` configuration is passed as Docker
build arguments because Next.js embeds those values into the browser bundle.

## Manual promotion

Use the workflow dispatch input `image_tag` to promote an existing ECR image
without rebuilding it. A normal release tag builds and deploys the matching
version automatically.

Never deploy `latest` to production and never put service-role keys or Authentik
client secrets in image build arguments.
