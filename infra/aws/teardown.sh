#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# DocAI + SplashDown — Complete AWS Teardown
# ============================================================
# Destroys ALL AWS resources to stop all billing.
# Run from: infra/aws/
#
# Usage:
#   cd infra/aws
#   ./teardown.sh              # interactive (prompts for confirmation)
#   ./teardown.sh --auto       # non-interactive (skips confirmation)
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "=== DocAI + SplashDown AWS Teardown ==="
echo ""
echo "This will PERMANENTLY DESTROY all AWS resources:"
echo "  - ECS services (DocAI + SplashDown)"
echo "  - RDS PostgreSQL database (all data)"
echo "  - S3 bucket (all uploaded documents)"
echo "  - ECR repositories (all Docker images)"
echo "  - ALB, VPC, security groups, IAM roles"
echo "  - GitHub OIDC provider"
echo ""
echo "Monthly AWS charges will stop immediately."
echo ""

if [[ "${1:-}" != "--auto" ]]; then
  read -rp "Type 'destroy' to confirm: " CONFIRM
  if [[ "$CONFIRM" != "destroy" ]]; then
    echo "Aborted."
    exit 1
  fi
fi

# Scale ECS services to 0 first (faster teardown, avoids dependency issues)
echo ""
echo "Scaling down ECS services..."
aws ecs update-service --cluster docai-prod-cluster --service docai-prod-service --desired-count 0 --no-cli-pager 2>/dev/null || true
aws ecs update-service --cluster docai-prod-cluster --service docai-prod-splashdown --desired-count 0 --no-cli-pager 2>/dev/null || true
echo "Waiting for tasks to drain..."
sleep 10

# Terraform destroy
echo ""
echo "Running terraform destroy..."
if [[ -f prod.tfvars ]]; then
  terraform destroy -var-file=prod.tfvars -auto-approve
else
  echo "No prod.tfvars found. You may need to provide variables."
  echo "Attempting destroy with defaults (will prompt for required vars)..."
  terraform destroy
fi

echo ""
echo "=== Teardown complete ==="
echo "All AWS resources have been destroyed. No further charges will accrue."
echo ""
echo "To redeploy later:"
echo "  cd infra/aws"
echo "  cp prod.tfvars.example prod.tfvars  # fill in values"
echo "  terraform init"
echo "  terraform apply -var-file=prod.tfvars"
