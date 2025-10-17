param(
  [Parameter(Mandatory=$true)][string]$Uid,
  [Parameter(Mandatory=$true)][string]$AdminKey,
  [string]$Base = "https://discomi-mvp-ochre.vercel.app"
)

$diagUrl = "$Base/api/diag?uid=$([uri]::EscapeDataString($Uid))"

try {
  $resp = Invoke-RestMethod -Uri $diagUrl -Headers @{ "x-admin-key" = $AdminKey } -Method GET
} catch {
  Write-Host "Request failed:" -ForegroundColor Red
  Write-Host $_.Exception.Message
  if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
  exit 1
}

Write-Host "`nDiag response:" -ForegroundColor Cyan
$resp | ConvertTo-Json -Depth 6

# Build full webhook test URL if server returned the path
$fullWebhookUrl = $null
if ($resp.expectedQueryExample) {
  $path = [string]$resp.expectedQueryExample
  if ($path.StartsWith("http")) { $fullWebhookUrl = $path } else { $fullWebhookUrl = "$Base$path" }
}

if ($fullWebhookUrl) {
  Write-Host "`nWebhook test URL:" -ForegroundColor Yellow
  Write-Host $fullWebhookUrl

  # Construct a sample payload the webhook accepts
  $payload = @{
    created_at = (Get-Date).ToUniversalTime().ToString("o")
    structured = @{
      title    = "DiscOmi self-test"
      overview = "This bypasses Omi to prove the pipeline."
      category = "idea"
    }
  } | ConvertTo-Json -Depth 8

  Write-Host "`nTo post a test payload now, run:" -ForegroundColor Yellow
  Write-Host "Invoke-RestMethod -Uri `"$fullWebhookUrl`" -Method Post -ContentType `"application/json`" -Body '$payload'"
} else {
  Write-Host "`nNo expectedQueryExample from server. Check USE_SUPABASE and that the uid is registered." -ForegroundColor Red
}
