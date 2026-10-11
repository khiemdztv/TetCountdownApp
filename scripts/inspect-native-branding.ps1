param([Parameter(Mandatory=$true)][int]$AppProcessId,[Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class BrandingWindow {
  public delegate bool Callback(IntPtr window, IntPtr parameter);
  [DllImport("user32.dll")] public static extern bool EnumWindows(Callback callback, IntPtr parameter);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr window, out uint pid);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr window, StringBuilder text, int length);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr window,uint message,IntPtr wParam,IntPtr lParam);
  public static IntPtr Find(int pid) {
    IntPtr result=IntPtr.Zero;
    EnumWindows((window,parameter)=>{uint owner;GetWindowThreadProcessId(window,out owner);var text=new StringBuilder(256);GetWindowText(window,text,text.Capacity);if(owner==pid && text.ToString()=="TetCountdownApp"){result=window;return false;}return true;},IntPtr.Zero);
    return result;
  }
}
"@
$process = Get-Process -Id $AppProcessId
$metadata = [Diagnostics.FileVersionInfo]::GetVersionInfo($process.Path)
$window = [BrandingWindow]::Find($AppProcessId)
if ($window -eq [IntPtr]::Zero) { throw 'Native window title mismatch' }
$small = [BrandingWindow]::SendMessage($window,0x7F,[IntPtr]0,[IntPtr]::Zero)
$big = [BrandingWindow]::SendMessage($window,0x7F,[IntPtr]1,[IntPtr]::Zero)
if ($small -eq [IntPtr]::Zero -or $big -eq [IntPtr]::Zero) { throw 'Window icon is missing' }
foreach($entry in @(@{name='small';handle=$small},@{name='big';handle=$big})) {
  $image = [Drawing.Icon]::FromHandle($entry.handle).ToBitmap()
  $image.Save((Join-Path $OutputDirectory ('window-icon-'+$entry.name+'.png')),[Drawing.Imaging.ImageFormat]::Png)
  $image.Dispose()
}
@{title='TetCountdownApp';description=$metadata.FileDescription;product=$metadata.ProductName;executable=[IO.Path]::GetFileName($process.Path);smallIcon=$true;bigIcon=$true} | ConvertTo-Json -Compress
