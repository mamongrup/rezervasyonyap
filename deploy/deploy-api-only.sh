#!/usr/bin/env bash
# Yalnızca travel-api (Gleam backend) — checkout/API düzeltmeleri için.
# Frontend build atlanır (~5–15 dk kazanç). NEXT_PUBLIC_* veya .tsx değiştiyse tam deploy kullanın.
#
#   chmod +x deploy/deploy-api-only.sh
#   ./deploy/deploy-api-only.sh
#
# Opsiyonel:
#   DEPLOY_REF=main ./deploy/deploy-api-only.sh
#   SKIP_VERIFY=1 ./deploy/deploy-api-only.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export SKIP_FRONTEND_BUILD=1
export RESTART_WEB=0
exec "$ROOT/deploy/deploy.sh"
