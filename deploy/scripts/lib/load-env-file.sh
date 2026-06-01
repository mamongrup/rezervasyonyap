#!/usr/bin/env bash
# Yalnızca KEY=value satırlarını export eder (nano'ya yapışan chmod/açıklama satırları çalıştırılmaz).
load_env_file() {
  local f="$1"
  [[ -f "$f" ]] || return 0
  local tmp
  tmp="$(mktemp)"
  # CRLF (Windows nano) → LF
  tr -d '\r' <"$f" | grep -E '^[A-Za-z_][A-Za-z0-9_]*=' >"$tmp" || true
  if [[ -s "$tmp" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$tmp"
    set +a
  fi
  rm -f "$tmp"
}
