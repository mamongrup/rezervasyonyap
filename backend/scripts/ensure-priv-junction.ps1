# Gleam priv junction (Windows, Geliştirici Modu olmadan)
$root = Split-Path $PSScriptRoot -Parent
$priv = Join-Path $root 'priv'
$link = Join-Path $root 'build\dev\erlang\backend\priv'
if (-not (Test-Path $priv)) { throw "priv bulunamadi: $priv" }
New-Item -ItemType Directory -Force -Path (Split-Path $link -Parent) | Out-Null
if (Test-Path $link) {
  $item = Get-Item $link -Force
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { exit 0 }
  Remove-Item $link -Recurse -Force
}
cmd /c "mklink /J `"$link`" `"$priv`"" | Out-Null
if (-not (Test-Path $link)) { throw "Junction olusturulamadi: $link" }
