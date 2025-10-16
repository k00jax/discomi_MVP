param(
  [Parameter(Mandatory=$true)][string]$Token,
  [string]$Uid = "test-user"
)

$ErrorActionPreference = "Stop"

# Config
$URL = "https://discomi-mvp-ochre.vercel.app/api/webhook?token=$Token&uid=$Uid"
Write-Host "POST -> $URL" -ForegroundColor Cyan

# Sample Omi-like payload
$payload = @{
  id = 123
  created_at = "2024-07-22T23:59:45.910559+00:00"
  structured = @{
    title = "Conversation Title"
    category = "personal"
    emoji = "🙂"
    overview = "Brief overview from Omi."
  }
  transcript_segments = @(
    @{ text = "Segment one." },
    @{ text = "Segment two." }
  )
} | ConvertTo-Json -Depth 10

try {
  # Show length + first 120 chars so we know it's UTF-8
  Write-Host ("Payload bytes: " + ([Text.Encoding]::UTF8.GetByteCount($payload)))
  Write-Host ("Payload peek:  " + $payload.Substring(0, [Math]::Min(120, $payload.Length)))

  $resp = Invoke-RestMethod `
    -Uri $URL `
    -Method Post `
    -ContentType "application/json; charset=utf-8" `
    -Body $payload `
    -MaximumRedirection 0 `
    -TimeoutSec 30 `
    -Verbose

  Write-Host "Response:" -ForegroundColor Green
  $resp
}
catch {
  Write-Host "Error:" -ForegroundColor Red
  $_ | Format-List -Force
}
