# uploads-backup.ps1
# Panelden yüklenen görselleri dışarı yedekler (git tarafından takip edilmez)
# Kullanım: .\uploads-backup.ps1
# Geri yükleme: .\uploads-backup.ps1 -Restore

param(
    [switch]$Restore
)

$uploadsDir = "$PSScriptRoot\fronted\public\uploads"
$backupDir  = "$PSScriptRoot\..\travel-uploads-backup"   # repo dışında
$timestamp  = Get-Date -Format "yyyy-MM-dd_HH-mm"

if ($Restore) {
    if (-not (Test-Path $backupDir)) {
        Write-Error "Yedek klasörü bulunamadı: $backupDir"
        exit 1
    }
    # En son yedeği bul
    $latest = Get-ChildItem $backupDir -Directory | Sort-Object Name -Descending | Select-Object -First 1
    if (-not $latest) { Write-Error "Hiç yedek yok."; exit 1 }
    Write-Host "Geri yükleniyor: $($latest.FullName) → $uploadsDir"
    Copy-Item "$($latest.FullName)\*" $uploadsDir -Recurse -Force
    Write-Host "Tamam."
} else {
    $dest = "$backupDir\$timestamp"
    New-Item -ItemType Directory -Force -Path $dest | Out-Null
    Copy-Item "$uploadsDir\*" $dest -Recurse -Force
    Write-Host "Yedek oluşturuldu: $dest"
    # 10'dan fazla yedek varsa eskisini sil
    $all = Get-ChildItem $backupDir -Directory | Sort-Object Name -Descending
    if ($all.Count -gt 10) {
        $all | Select-Object -Skip 10 | ForEach-Object {
            Remove-Item $_.FullName -Recurse -Force
            Write-Host "Eski yedek silindi: $($_.Name)"
        }
    }
}
