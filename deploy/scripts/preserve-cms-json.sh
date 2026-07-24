#!/usr/bin/env bash
# Panel CMS JSON — git reset --hard sonrası geri yükle.
# Kaynak: frontend/public/page-builder/*.json + featured-listings/*.json
# (panel kaydı commit edilmez; deploy silmesin diye).
#
# Kullanım (deploy.sh içinden):
#   source deploy/scripts/preserve-cms-json.sh
#   preserve_cms_json_backup
#   git_sync_ref ...
#   restore_cms_json_backup
set -euo pipefail

preserve_cms_json_backup() {
  local app_root="${1:-${APP_ROOT:-}}"
  [[ -n "$app_root" ]] || { echo "preserve_cms_json: APP_ROOT yok" >&2; return 1; }

  if [[ "${CMS_JSON_PRESERVE:-1}" == "0" ]]; then
    echo "[cms-json] CMS_JSON_PRESERVE=0 — yedek atlandı"
    return 0
  fi

  local bak="$app_root/.deploy/cms-json-preserve"
  rm -rf "$bak"
  mkdir -p "$bak/page-builder" "$bak/featured-listings"

  local n=0
  if [[ -d "$app_root/frontend/public/page-builder" ]]; then
    local f
    for f in "$app_root/frontend/public/page-builder/"*.json; do
      [[ -f "$f" ]] || continue
      cp -a "$f" "$bak/page-builder/"
      n=$((n + 1))
    done
  fi
  if [[ -d "$app_root/frontend/public/featured-listings" ]]; then
    local f
    for f in "$app_root/frontend/public/featured-listings/"*.json; do
      [[ -f "$f" ]] || continue
      cp -a "$f" "$bak/featured-listings/"
      n=$((n + 1))
    done
  fi
  echo "[cms-json] yedek: $n dosya → $bak"
}

restore_cms_json_backup() {
  local app_root="${1:-${APP_ROOT:-}}"
  [[ -n "$app_root" ]] || { echo "preserve_cms_json: APP_ROOT yok" >&2; return 1; }

  if [[ "${CMS_JSON_PRESERVE:-1}" == "0" ]]; then
    echo "[cms-json] CMS_JSON_PRESERVE=0 — geri yükleme atlandı"
    return 0
  fi

  local bak="$app_root/.deploy/cms-json-preserve"
  if [[ ! -d "$bak" ]]; then
    echo "[cms-json] yedek yok — atlandı"
    return 0
  fi

  mkdir -p "$app_root/frontend/public/page-builder" "$app_root/frontend/public/featured-listings"
  local n=0
  local f
  for f in "$bak/page-builder/"*.json; do
    [[ -f "$f" ]] || continue
    cp -a "$f" "$app_root/frontend/public/page-builder/"
    n=$((n + 1))
  done
  for f in "$bak/featured-listings/"*.json; do
    [[ -f "$f" ]] || continue
    cp -a "$f" "$app_root/frontend/public/featured-listings/"
    n=$((n + 1))
  done
  echo "[cms-json] geri yüklendi: $n dosya (panel düzenlemeleri korundu)"
}
