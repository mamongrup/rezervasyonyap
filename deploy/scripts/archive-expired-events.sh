#!/usr/bin/env bash
set -euo pipefail

APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
echo "[archive-expired-events] $(date -u +%Y-%m-%dT%H:%M:%SZ) start"
"$APP_ROOT/deploy/apply-sql.sh" backend/priv/sql/maintenance/archive_expired_events.sql
echo "[archive-expired-events] $(date -u +%Y-%m-%dT%H:%M:%SZ) done"
