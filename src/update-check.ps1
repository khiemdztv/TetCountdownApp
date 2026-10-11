param([Parameter(Mandatory=$true)][string]$Url)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
# Allow only the public release API and manifests for this application.
$apiUrl = 'https://api.github.com/repos/khiemdztv/TetCountdownApp/releases/latest'
$manifestPattern = '^https://github\.com/khiemdztv/TetCountdownApp/releases/download/v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)/update-manifest\.json$'
$response = $null
$stream = $null
$memory = $null
try {
    if ($Url -cne $apiUrl -and $Url -cnotmatch $manifestPattern) { throw 'Untrusted update URL' }
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $request = [Net.HttpWebRequest]::Create($Url)
    $request.Method = 'GET'
    $request.UserAgent = 'TetCountdownApp-Updater'
    $request.Accept = 'application/json'
    $request.AllowAutoRedirect = $true
    $request.MaximumAutomaticRedirections = 8
    $request.Timeout = 15000
    $request.ReadWriteTimeout = 15000
    $request.AutomaticDecompression = [Net.DecompressionMethods]::GZip -bor [Net.DecompressionMethods]::Deflate
    try { $response = $request.GetResponse() }
    catch [Net.WebException] {
        if ($null -eq $_.Exception.Response) { throw }
        $response = $_.Exception.Response
    }
    $status = [int]$response.StatusCode
    $body = ''
    if ($status -eq 200) {
        if ($response.ContentLength -gt 262144) { throw 'Update response too large' }
        $stream = $response.GetResponseStream()
        $memory = New-Object IO.MemoryStream
        $buffer = New-Object byte[] 8192
        $deadline = [DateTime]::UtcNow.AddSeconds(20)
        while (($count = $stream.Read($buffer, 0, $buffer.Length)) -gt 0) {
            if ($memory.Length + $count -gt 262144 -or [DateTime]::UtcNow -gt $deadline) { throw 'Update response limit exceeded' }
            $memory.Write($buffer, 0, $count)
        }
        $body = [Convert]::ToBase64String($memory.ToArray())
    }
    @{ status = $status; bodyBase64 = $body } | ConvertTo-Json -Compress
    exit 0
} catch {
    [Console]::Error.WriteLine('Unable to fetch update metadata: ' + $_.Exception.Message)
    exit 1
} finally {
    if ($stream) { $stream.Dispose() }
    if ($memory) { $memory.Dispose() }
    if ($response) { $response.Close() }
}
