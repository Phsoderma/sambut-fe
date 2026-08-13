param([string]$ApiUrl = "http://127.0.0.1:7860", [int]$Port = 3000)
$ErrorActionPreference = "Stop"
$env:NEXT_PUBLIC_SAMBUT_API_URL = $ApiUrl
& npm.cmd run dev -- --hostname 127.0.0.1 --port $Port
