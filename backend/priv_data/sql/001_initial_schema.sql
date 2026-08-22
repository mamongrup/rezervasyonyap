-- Bu dosya yerine modüler şema kullanılır (her modül ayrı tablolar).
-- Kurulum: priv/sql/install_order.txt içindeki sırayla modules/*.sql dosyalarını çalıştırın.
--
-- Örnek (PowerShell, psql PATH'te ise):
--   Get-Content priv/sql/install_order.txt | Where-Object { $_ -notmatch '^#' -and $_.Trim() -ne '' } | ForEach-Object { psql -U postgres -d travel -f $_.Trim() }
--
-- API: GET /api/v1/modules — çalışan uygulamada modül listesi (Gleam travel/module_tree).

SELECT 1 AS use_modular_schema_under_priv_sql_modules;
