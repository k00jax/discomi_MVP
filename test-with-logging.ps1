# Test webhook with detailed logging
$uid = "W7xTEw3Yjde3XSbUyS0ZSNlcb852"
$token = "u_a228ec0af0ae258b3f15a1a4e89c48952a6f4abb30d7c613"

Write-Host "=== Testing Developer Settings URL ===" -ForegroundColor Cyan
Write-Host ""

$url = "https://discomi-mvp-ochre.vercel.app/api/webhook?token=$token&uid=$uid"
Write-Host "URL: $url" -ForegroundColor Yellow
Write-Host ""

$payload = @{
    id = "test-conversation-001"
    created_at = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    transcript_segments = @(
        @{ text = "This is a test conversation from Developer Settings." }
    )
    structured = @{
        title = "Test Conversation"
        overview = "Testing the webhook with detailed error logging."
        category = "personal"
    }
} | ConvertTo-Json -Depth 5

Write-Host "Sending test payload..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri $url -Method POST -Body $payload -ContentType "application/json" -ErrorAction Stop
    Write-Host ""
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host "Response: $response" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "FAILED!" -ForegroundColor Red
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Body: $responseBody" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Check Vercel logs for detailed error: https://vercel.com/k00jax/discomi-mvp/logs" -ForegroundColor Cyan
