param(
  [Parameter(Mandatory = $true)][string]$BackupDocx,
  [Parameter(Mandatory = $true)][string]$DocumentXml,
  [Parameter(Mandatory = $true)][string]$OutDocx
)
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

Copy-Item -Path $BackupDocx -Destination $OutDocx -Force

$zip = [System.IO.Compression.ZipFile]::Open($OutDocx, 2) # ZipArchiveMode.Update
try {
  $old = $zip.GetEntry('word/document.xml')
  if ($old) { $old.Delete() }
  $newEntry = $zip.CreateEntry('word/document.xml', [System.IO.Compression.CompressionLevel]::Optimal)
  $xmlBytes = [System.IO.File]::ReadAllBytes($DocumentXml)
  $stream = $newEntry.Open()
  try {
    $stream.Write($xmlBytes, 0, $xmlBytes.Length)
  } finally {
    $stream.Close()
  }
} finally {
  $zip.Dispose()
}
