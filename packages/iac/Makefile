##─────────────────────────────────────────────────────────────────────────────
## CIG Infrastructure — Terraform Makefile
## Usage: make <target> ENV=prod
##─────────────────────────────────────────────────────────────────────────────

ENV        ?= prod
ENVDIR     := environments/$(ENV)
VARFILE    := $(ENVDIR)/$(ENV).tfvars
TF         := terraform -chdir=$(ENVDIR)
# secrets.auto.tfvars is gitignored and auto-loaded by Terraform when present
SECRETS_VARFILE := $(ENVDIR)/secrets.auto.tfvars

.PHONY: help init validate plan apply destroy output logs restart

help:
	@echo ""
	@echo "  CIG Infrastructure — Terraform targets"
	@echo ""
	@echo "  make init       ENV=prod   Initialize backend + providers"
	@echo "  make validate   ENV=prod   Validate Terraform config"
	@echo "  make plan       ENV=prod   Preview changes (safe)"
	@echo "  make apply      ENV=prod   Apply changes (prompts for confirmation)"
	@echo "  make apply-yes  ENV=prod   Apply without prompting (CI use)"
	@echo "  make output     ENV=prod   Show stack outputs"
	@echo "  make destroy    ENV=prod   Destroy all resources (DESTRUCTIVE)"
	@echo "  make logs       ENV=prod   Tail ECS logs from CloudWatch"
	@echo "  make restart    ENV=prod   Force-restart the ECS service"
	@echo ""

init:
	$(TF) init -reconfigure

validate: init
	$(TF) validate

plan: init
	$(TF) plan -var-file=$(CURDIR)/$(VARFILE) -out=tfplan

apply: init
	$(TF) apply -var-file=$(CURDIR)/$(VARFILE)

apply-yes: init
	$(TF) apply -var-file=$(CURDIR)/$(VARFILE) -auto-approve

apply-plan: init
	$(TF) apply tfplan

output:
	$(TF) output

destroy:
	@echo "WARNING: This will DESTROY all $(ENV) Authentik infrastructure."
	@read -p "Type the environment name to confirm ($(ENV)): " CONFIRM; \
	  if [ "$$CONFIRM" = "$(ENV)" ]; then \
	    $(TF) destroy -var-file=$(CURDIR)/$(VARFILE); \
	  else \
	    echo "Aborted."; \
	  fi

##─── Operational helpers ─────────────────────────────────────────────────────

# Tail the last 100 lines of Authentik ECS logs
logs:
	@CLUSTER=$$($(TF) output -raw ecs_cluster_name 2>/dev/null); \
	SERVICE=$$($(TF) output -raw ecs_service_name 2>/dev/null); \
	LOG_GROUP="/ecs/authentik-auth-cig-technology"; \
	echo "Streaming logs from $$LOG_GROUP"; \
	aws logs tail $$LOG_GROUP --follow --format short

# Force new ECS deployment (picks up latest task def / image)
restart:
	@CLUSTER=$$($(TF) output -raw ecs_cluster_name 2>/dev/null); \
	SERVICE=$$($(TF) output -raw ecs_service_name 2>/dev/null); \
	echo "Force-restarting $$SERVICE in $$CLUSTER"; \
	aws ecs update-service --cluster $$CLUSTER --service $$SERVICE --force-new-deployment --region us-east-2

# Retrieve the admin password from Secrets Manager
admin-password:
	@aws secretsmanager get-secret-value \
	  --secret-id "authentik/auth.cig.technology/admin-password" \
	  --region us-east-2 \
	  --query SecretString --output text
