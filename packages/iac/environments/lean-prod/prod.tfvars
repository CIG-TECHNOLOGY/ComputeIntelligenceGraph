# Lean production stack for the target AWS account.
# This root expects route53_zone_id and api_image_uri at apply time so it can be
# driven by the migration helper script.
#
# Sizing defaults:
#   API host: t3.medium
#   Authentik host: t3.small
#   Neo4j data: 25 GiB
#
# Sensitive values (smtp_username, smtp_password) live in secrets.auto.tfvars
# which is gitignored. Copy secrets.auto.tfvars.example and fill in the values.

smtp_host = "mail.xn--tlo-fla.com"
smtp_port = 587
smtp_from = "notifications@cig.technology"

# Monitor SaaS
monitor_domain       = "status.cig.technology"
monitor_ui_image_tag = "ghcr.io/cig-technology/monitor-ui:latest"
gatus_image_tag      = "latest"
monitor_authentik_url = "https://auth.cig.technology/application/o/monitor/"
