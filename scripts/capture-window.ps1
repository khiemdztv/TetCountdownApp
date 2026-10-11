# Chup cua so ung dung de kiem tra giao dien.
# Dung cho ca Electron lan Neutralino (tim cua so theo tieu de).
#
# QUAN TRONG: phai khai bao DPI-aware truoc moi thao tac cua so.
# Neu khong, Windows se "ao hoa" toa do: GetWindowRect tra ve kich thuoc
# nho hon thuc te va anh chup bi sai ti le (da tung gay nham lan).
#
# Vi du:
#   pwsh -File scripts/capture-window.ps1 -Match "2027" -Out "anh.png"

param(
  [string]$Match = '2027',
  [string]$Out = 'capture.png',
  [int]$WaitMs = 5000,
  [int]$ExtraWaitMs = 0,
  [switch]$ListOnly
)

Add-Type -AssemblyName System.Drawing

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32Dpi {
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int n);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [DllImport("user32.dll")] public static extern int GetDpiForWindow(IntPtr h);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@

# Khai bao DPI-aware TRUOC khi doc/chup cua so
[Win32Dpi]::SetProcessDPIAware() | Out-Null

function Get-AppWindow {
  Get-Process |
    Where-Object { $_.MainWindowTitle -and $_.MainWindowTitle -like "*$Match*" } |
    Sort-Object StartTime -Descending |
    Select-Object -First 1
}

if ($ListOnly) {
  Get-Process | Where-Object { $_.MainWindowTitle } |
    ForEach-Object { Write-Host ("[{0}] {1}" -f $_.ProcessName, $_.MainWindowTitle) }
  exit 0
}

Write-Host "Waiting $WaitMs ms for app to start..."
Start-Sleep -Milliseconds $WaitMs

$p = Get-AppWindow
if (-not $p) {
  Write-Host "NOT FOUND: no window matching '$Match'"
  Write-Host "Open windows:"
  Get-Process | Where-Object { $_.MainWindowTitle } | Select-Object -First 20 |
    ForEach-Object { Write-Host ("  [{0}] {1}" -f $_.ProcessName, $_.MainWindowTitle) }
  exit 1
}

Write-Host "Found: [$($p.ProcessName)] $($p.MainWindowTitle)  (pid $($p.Id))"

if ($ExtraWaitMs -gt 0) {
  Write-Host "Waiting extra $ExtraWaitMs ms..."
  Start-Sleep -Milliseconds $ExtraWaitMs
}

$h = $p.MainWindowHandle
[Win32Dpi]::ShowWindow($h, 9) | Out-Null
[Win32Dpi]::SetForegroundWindow($h) | Out-Null
Start-Sleep -Milliseconds 1400

$r = New-Object Win32Dpi+RECT
if (-not [Win32Dpi]::GetWindowRect($h, [ref]$r)) {
  Write-Host "Could not read window rect"
  exit 1
}

$w = $r.Right - $r.Left
$ht = $r.Bottom - $r.Top

$dpi = 0
try { $dpi = [Win32Dpi]::GetDpiForWindow($h) } catch { $dpi = 0 }
$scale = if ($dpi -gt 0) { [math]::Round($dpi / 96.0, 3) } else { 0 }

Write-Host "Window rect: ${w}x${ht} at ($($r.Left),$($r.Top))"
Write-Host "DPI: $dpi  -> scale $scale"
if ($scale -gt 0) {
  Write-Host ("CSS viewport (uoc tinh): {0}x{1}" -f [math]::Round($w / $scale), [math]::Round($ht / $scale))
}

$bmp = New-Object System.Drawing.Bitmap($w, $ht)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($r.Left, $r.Top, 0, 0, $bmp.Size)
$bmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()

Write-Host "Saved: $Out  ($([math]::Round((Get-Item $Out).Length/1KB,1)) KB)"
