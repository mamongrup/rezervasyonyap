#!/usr/bin/env bash
# POSIX — install_order.txt içindeki modules/*.sql dosyalarını sırayla uygular.
# Kullanım: chmod +x run_all.sh && PGDATABASE=travel ./run_all.sh
set -euo pipefail
BASE="$(cd "$(dirname "$0")" && pwd)"
PSQL="${PSQL:-psql}"
export PGDATABASE="${PGDATABASE:-travel}"
while IFS= read -r line || [[ -n "$line" ]]; do
  line="$(echo "$line" | tr -d '\r')"
  [[ "$line" =~ ^modules/.+\.sql$ ]] || continue
  echo "=== $line ==="
  "$PSQL" -v ON_ERROR_STOP=1 -f "$BASE/$line"
done <"$BASE/install_order.txt"
echo "Tamam: tum moduller uygulandi."
