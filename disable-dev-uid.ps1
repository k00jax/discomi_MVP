# Temporarily disable developer UID to force App Store testing

$admin = "o9ijpJNU1zY2cTKhkRQsO3y6VDftdwmg"
$devUid = "W7xTEw3Yjde3XSbUyS0ZSNlcb852"
$storeUid = "GPW9BKkHYWMkGTv3iSndMRAPS2B2"

Write-Host "=== Disabling Developer UID ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will temporarily disable: $devUid" -ForegroundColor Yellow
Write-Host "Forcing Omi to use App Store UID: $storeUid" -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod -Method POST -Headers @{ "x-admin-key" = $admin } -Uri "https://discomi-mvp-ochre.vercel.app/api/admin-toggle-uid?uid=$devUid&action=disable"
    
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json -Depth 3) -ForegroundColor Green
    Write-Host ""
    Write-Host "Developer UID is now disabled." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Force quit Omi app" -ForegroundColor White
    Write-Host "2. Reopen Omi app" -ForegroundColor White
    Write-Host "3. Create a test conversation" -ForegroundColor White
    Write-Host "4. Check if webhook is called with App Store UID" -ForegroundColor White
    Write-Host ""
    Write-Host "To re-enable developer UID later, run:" -ForegroundColor Cyan
    Write-Host "Invoke-RestMethod -Method POST -Headers @{ 'x-admin-key' = '$admin' } -Uri 'https://discomi-mvp-ochre.vercel.app/api/admin-toggle-uid?uid=$devUid&action=enable'" -ForegroundColor Yellow
} catch {
    Write-Host "FAILED!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
