#!/usr/bin/env bash
# Geriye dönük uyumluluk — tüm bekleyen deploy'a yönlendirir.
exec "$(cd "$(dirname "$0")" && pwd)/deploy-all-pending.sh" "$@"
