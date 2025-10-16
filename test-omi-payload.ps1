# Test Omi Memory Webhook with proper structure
$payload = @{
  id = 123
  created_at = "2024-07-22T23:59:45.910559+00:00"
  transcript_segments = @(
    @{ text = "Segment one." }
    @{ text = "Segment two." }
  )
  structured = @{
    title = "Conversation Title"
    overview = "Brief overview from Omi."
    emoji = "🙂"
    category = "personal"
  }
} | ConvertTo-Json -Depth 10

Write-Host "Testing Omi webhook with payload:"
Write-Host $payload

# Test locally (change URL for production)
$url = "http://localhost:3000/api/webhook?token=kyle_4b6f9c2d570b4a51a9a0&uid=test123"

try {
  $response = Invoke-RestMethod -Uri $url -Method Post -ContentType "application/json" -Body $payload
  Write-Host "`nSuccess! Response: $response"
} catch {
  Write-Host "`nError: $_"
  Write-Host $_.Exception.Response
}
