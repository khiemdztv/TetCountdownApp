param(
  [Parameter(Mandatory=$true)][ValidateSet('Download','Apply')][string]$Action,
  [Parameter(Mandatory=$true)][string]$RequestFile
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$request = Get-Content -LiteralPath $RequestFile -Raw -Encoding UTF8 | ConvertFrom-Json
$appDir = [IO.Path]::GetFullPath([string]$request.appDir)
$updateDir = Join-Path $appDir '.update'
# All writable targets are fixed paths within this application's directory.
if ([IO.Path]::GetFullPath($RequestFile) -ne (Join-Path $updateDir 'request.json')) { throw 'Invalid request path' }
$stage = Join-Path $updateDir 'resources.next.neu'
$target = Join-Path $appDir 'resources.neu'
$backup = Join-Path $updateDir 'resources.previous.neu'
$ready = Join-Path $updateDir 'ready.json'
$resultFile = Join-Path $updateDir 'result.json'
function Test-Package {
  if (!(Test-Path -LiteralPath $stage -PathType Leaf)) { throw 'Update file is missing' }
  if ((Get-Item -LiteralPath $stage).Length -ne [long]$request.size) { throw 'Update size mismatch' }
  if ((Get-FileHash -LiteralPath $stage -Algorithm SHA256).Hash.ToLowerInvariant() -ne [string]$request.sha256) { throw 'Update SHA256 mismatch' }
  # Check ASAR header before replacing the running app's resources.
  $stream = [IO.File]::OpenRead($stage)
  try {
    $reader = New-Object IO.BinaryReader($stream)
    if ($reader.ReadUInt32() -ne 4) { throw 'Invalid resource bundle' }
    $headerBytes = $reader.ReadUInt32()
    $null = $reader.ReadUInt32()
    $jsonBytes = $reader.ReadUInt32()
    if ($headerBytes -gt 8388608 -or $jsonBytes -gt ($headerBytes - 8)) { throw 'Invalid resource header' }
    $header = [Text.Encoding]::UTF8.GetString($reader.ReadBytes($jsonBytes)) | ConvertFrom-Json
    if (!$header.files.resources.files.'index.html' -or !$header.files.'neutralino.config.json') { throw 'Missing application resources' }
  } finally { $stream.Dispose() }
}
function Save-Result([string]$status, [string]$message) {
  @{status=$status; message=$message; version=$request.version} | ConvertTo-Json -Compress | Set-Content -LiteralPath $resultFile -Encoding UTF8
}
$replaced = $false
$restored = $false
$newProcess = $null
try {
  if ($Action -eq 'Download') {
    $url = [Uri][string]$request.url
    if ($url.Scheme -ne 'https' -or $url.Host -ne 'github.com' -or !$url.AbsolutePath.StartsWith('/khiemdztv/TetCountdownApp/releases/download/')) {
      # Loopback downloads require the isolated test flag; production uses GitHub.
      if (!$request.testing -or $url.Scheme -ne 'http' -or $url.Host -ne '127.0.0.1') { throw 'Untrusted update URL' }
    }
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $url.AbsoluteUri -OutFile $stage -UseBasicParsing -TimeoutSec 180 -UserAgent 'TetCountdownApp-Updater'
    Test-Package
    @{verified=$true; size=(Get-Item -LiteralPath $stage).Length} | ConvertTo-Json -Compress
    exit 0
  }
  Test-Package
  $oldProcess = Get-Process -Id ([int]$request.processId) -ErrorAction SilentlyContinue
  if ($oldProcess -and !$oldProcess.WaitForExit(30000)) { throw 'Application has not exited' }
  if (Test-Path -LiteralPath $ready) { Remove-Item -LiteralPath $ready }
  # File.Replace is atomic, leaves one previous version for recovery.
  [IO.File]::Replace($stage, $target, $backup, $true)
  $replaced = $true
  $appExe = Join-Path $appDir 'TetCountdownApp.exe'
  # Existing v1.0.0 installations keep their original executable filename.
  if (!(Test-Path -LiteralPath $appExe -PathType Leaf)) { $appExe = Join-Path $appDir 'TetCountdown2027-win_x64.exe' }
  $arguments = @()
  if ($request.testing) { $arguments = @($request.restartArgs) }
  # The updater process stays hidden, but the user's app must start normally.
  # SW_HIDE can leave the WebView compositor white/black after DPI resizing.
  $startOptions = @{FilePath=$appExe; WorkingDirectory=$appDir; PassThru=$true; WindowStyle='Normal'}
  if ($request.testing) { $startOptions.WindowStyle = 'Hidden' }
  if ($arguments.Count) { $startOptions.ArgumentList=$arguments }
  $newProcess = Start-Process @startOptions
  $healthy = $false
  for ($attempt = 0; $attempt -lt 100; $attempt++) {
    Start-Sleep -Milliseconds 300
    if (Test-Path -LiteralPath $ready) {
      try { $launch = Get-Content -LiteralPath $ready -Raw -Encoding UTF8 | ConvertFrom-Json; $healthy = ($launch.version -eq $request.version) } catch {}
      if ($healthy) { break }
    }
    if ($newProcess.HasExited) { break }
  }
  if (!$healthy) {
    if (!$newProcess.HasExited) { Stop-Process -Id $newProcess.Id -Force; $newProcess.WaitForExit() }
    [IO.File]::Replace($backup, $target, (Join-Path $updateDir 'resources.failed.neu'), $true)
    $restored = $true
    Save-Result 'rolled-back' 'New version did not start; previous version restored'
    $null = Start-Process @startOptions
    exit 1
  }
  Save-Result 'installed' 'Update installed successfully'
} catch {
  $failure = $_.Exception.Message
  if ($replaced -and !$restored -and (Test-Path -LiteralPath $backup)) {
    try {
      if ($newProcess -and !$newProcess.HasExited) { Stop-Process -Id $newProcess.Id -Force; $newProcess.WaitForExit() }
      [IO.File]::Replace($backup, $target, (Join-Path $updateDir 'resources.failed.neu'), $true)
      $restored = $true
      Save-Result 'rolled-back' $failure
      $null = Start-Process @startOptions
    } catch { Save-Result 'error' ('Recovery failed: ' + $_.Exception.Message) }
  }
  if ($Action -eq 'Download' -and (Test-Path -LiteralPath $stage)) { Remove-Item -LiteralPath $stage }
  if (!$restored) { Save-Result 'error' $failure }
  [Console]::Error.WriteLine($failure)
  exit 1
}
