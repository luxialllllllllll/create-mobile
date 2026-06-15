$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$port = if ($env:PORT) { [int]$env:PORT } else { 4175 }

$ipconfig = ipconfig
$ip = ($ipconfig | Select-String -Pattern "IPv4.*?:\s*(\d+\.\d+\.\d+\.\d+)" |
  ForEach-Object { $_.Matches[0].Groups[1].Value } |
  Where-Object { $_ -notlike "127.*" -and $_ -notlike "169.254.*" } |
  Select-Object -First 1)

if (-not $ip) {
  $ip = "你的电脑局域网 IP"
}

Write-Host ""
Write-Host "create-ex mobile is starting..." -ForegroundColor Green
Write-Host "电脑访问: http://127.0.0.1:$port/web-version/"
Write-Host "手机访问: http://$ip`:$port/web-version/"
Write-Host ""
Write-Host "手机和电脑需要连接同一个 Wi-Fi。若打不开，请允许 Windows 防火墙放行 Python。"
Write-Host "按 Ctrl+C 停止服务。"
Write-Host ""

Set-Location $PSScriptRoot
node server.js
