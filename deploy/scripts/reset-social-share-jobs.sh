#!/usr/bin/env bash
# Sosyal paylaşım geçmişini ve bekleyen işleri sıfırlar.
# Kullanım:
#   CONFIRM=RESET_SOCIAL_JOBS ./deploy/scripts/reset-social-share-jobs.sh
set -euo pipefail

if [[ "${CONFIRM:-}" != "RESET_SOCIAL_JOBS" ]]; then
  echo "[ABORT] Bu komut tum sosyal paylasim islerini siler." >&2
  echo "Calistirmak icin: CONFIRM=RESET_SOCIAL_JOBS $0" >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

"${REPO_ROOT}/deploy/apply-sql.sh" -c "BEGIN; DELETE FROM social_share_jobs; COMMIT;"
echo "[OK] social_share_jobs sifirlandi"
