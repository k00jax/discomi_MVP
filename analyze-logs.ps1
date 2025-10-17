# Check what's happening after webhook receives payload
# Based on the log showing payload keys were received

Write-Host "`n=== Analyzing the Issue ===" -ForegroundColor Cyan
Write-Host "`nYour logs show: [DiscOmi] build discOmi-proof-001 keys: [ 'created_at', 'structured', 'id', 'transcript_segments' ]" -ForegroundColor Yellow
Write-Host "`nThis means:" -ForegroundColor White
Write-Host "✅ Omi IS calling your webhook" -ForegroundColor Green
Write-Host "✅ Payload is being received" -ForegroundColor Green
Write-Host "✅ Your code is processing it" -ForegroundColor Green
Write-Host "`n❌ But it's not posting to Discord" -ForegroundColor Red

Write-Host "`n=== Possible Causes ===" -ForegroundColor Cyan

Write-Host "`n1. Missing UID in request" -ForegroundColor Yellow
Write-Host "   - The payload keys don't include 'uid'" -ForegroundColor Gray
Write-Host "   - Check if Omi is sending uid in query params" -ForegroundColor Gray
Write-Host "   - Look for 'missing_uid' in logs" -ForegroundColor Gray

Write-Host "`n2. User not registered for this UID" -ForegroundColor Yellow
Write-Host "   - App store may be using different UID than developer settings" -ForegroundColor Gray
Write-Host "   - Check for 'setup_required' or 'db_error' in logs" -ForegroundColor Gray

Write-Host "`n3. Authentication failing" -ForegroundColor Yellow
Write-Host "   - Check for 'unauthorized' in logs" -ForegroundColor Gray
Write-Host "   - App token or user token mismatch" -ForegroundColor Gray

Write-Host "`n=== What to Look For in Full Logs ===" -ForegroundColor Cyan
Write-Host "After the 'keys:' line, you should see:" -ForegroundColor White
Write-Host "- [DiscOmi] Single-user fallback: using uid X" -ForegroundColor Gray
Write-Host "- OR error message: missing_uid, setup_required, unauthorized, db_error" -ForegroundColor Gray
Write-Host "- OR success: (no error = posted to Discord)" -ForegroundColor Gray

Write-Host "`n=== Action Items ===" -ForegroundColor Cyan
Write-Host "1. Share the FULL log output (next 5-10 lines after 'keys:')" -ForegroundColor White
Write-Host "2. Create a new conversation and capture ALL log lines" -ForegroundColor White
Write-Host "3. Look for HTTP status codes (200, 400, 401, 403, 500)" -ForegroundColor White

Write-Host "`n=== Quick Test ===" -ForegroundColor Cyan
Write-Host "Let me check if the issue is UID-related..." -ForegroundColor Yellow

$uid = "W7xTEw3Yjde3XSbUyS0ZSNlcb852"
$admin = "o9ijpJNU1zY2cTKhkRQsO3y6VDftdwmg"

try {
    $diag = Invoke-RestMethod -Headers @{ "x-admin-key" = $admin } -Uri "https://discomi-mvp-ochre.vercel.app/api/diag?uid=$uid"
    
    Write-Host "`nYour registered UID: $uid" -ForegroundColor Cyan
    Write-Host "Discord webhook: $($diag.row.webhookUrl.Substring(0, 60))..." -ForegroundColor Cyan
    
    Write-Host "`nCheck logs for:" -ForegroundColor Yellow
    Write-Host "- Does the UID in logs match: $uid ?" -ForegroundColor White
    Write-Host "- If different UID, you need to re-register with app store UID" -ForegroundColor White
} catch {
    Write-Host "`nError checking registration: $($_.Exception.Message)" -ForegroundColor Red
}
