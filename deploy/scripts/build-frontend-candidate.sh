#!/bin/bash
set -euo pipefail
APP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TRAVEL_BUILD_DIST="${1:-.next-candidate-$(date +%Y%m%d%H%M%S)}"
TRAVEL_BUILD_UNIT="${2:-travel-frontend-build-$(date +%Y%m%d%H%M%S)}"
[[ "$EUID" -eq 0 ]] || { printf "Run this build wrapper as root.\n" >&2; exit 1; }
[[ "$TRAVEL_BUILD_DIST" =~ ^[.]next-[A-Za-z0-9._-]+$ ]] || { printf "Invalid candidate directory.\n" >&2; exit 1; }
[[ "$TRAVEL_BUILD_UNIT" =~ ^[A-Za-z0-9_.@-]+$ ]] || { printf "Invalid service name.\n" >&2; exit 1; }
TRAVEL_BUILD_FREE_KB="$(df -Pk "$APP_ROOT" | awk 'NR==2 {print $4}')"
[[ "$TRAVEL_BUILD_FREE_KB" -ge 5242880 ]] || { printf "At least 5 GiB of free disk is required.\n" >&2; exit 1; }
TRAVEL_BUILD_MASK="/var/lib/travel/build-empty-uploads"
install -d -m 700 "$TRAVEL_BUILD_MASK"
[[ -z "$(find "$TRAVEL_BUILD_MASK" -mindepth 1 -maxdepth 1 -print -quit)" ]] || { printf "The private build mask must be empty.\n" >&2; exit 1; }
test -d "$APP_ROOT/frontend/public/uploads"
test -x "${TRAVEL_NODE_BIN:-/opt/node-v25.9.0-linux-x64/bin/node}"
# Only this transient build sees an empty media directory. Host uploads and serving paths are untouched.
exec systemd-run --unit="$TRAVEL_BUILD_UNIT" -p User=root -p "WorkingDirectory=$APP_ROOT/frontend" -p "EnvironmentFile=${TRAVEL_FRONTEND_ENV:-/etc/rezervasyonyap/frontend.env}" -p "BindReadOnlyPaths=$TRAVEL_BUILD_MASK:$APP_ROOT/frontend/public/uploads" -p PrivateMounts=yes -p MemoryMax=8G -p LimitCORE=0 -p "CPUQuota=${TRAVEL_BUILD_CPU_QUOTA:-200%}" -p Nice=15 --setenv="NEXT_BUILD_DIR=$TRAVEL_BUILD_DIST" --setenv=TRAVEL_LOW_IO_BUILD=1 "${TRAVEL_NODE_BIN:-/opt/node-v25.9.0-linux-x64/bin/node}" --max-old-space-size=6144 "$APP_ROOT/frontend/node_modules/next/dist/bin/next" build --webpack
