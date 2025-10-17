# Check which Discord webhook is registered for app store UID
$ErrorActionPreference = "Stop"

$appStoreUID = "GPW9BKkHYWMkGTv3iSndMRAPS2B2"
$admin = "o9ijpJNU1zY2cTKhkRQsO3y6VDftdwmg"

Write-Host "`n=== Checking App Store UID Registration ===" -ForegroundColor Cyan

try {
    $diag = Invoke-RestMethod -Headers @{ "x-admin-key" = $admin } -Uri "https://discomi-mvp-ochre.vercel.app/api/diag?uid=$appStoreUID"
    
    Write-Host "`nApp Store UID: $appStoreUID" -ForegroundColor Yellow
    Write-Host "Registered: $($diag.hasRow)" -ForegroundColor $(if ($diag.hasRow) { "Green" } else { "Red" })
    
    if ($diag.hasRow) {
        Write-Host "`nDiscord Webhook:" -ForegroundColor Cyan
        Write-Host $diag.row.webhookUrl -ForegroundColor White
        
        Write-Host "`nToken Prefix: $($diag.row.tokenPrefix)" -ForegroundColor Gray
        Write-Host "Last Updated: $($diag.row.updated_at)" -ForegroundColor Gray
        
        Write-Host "`n=== SOLUTION ===" -ForegroundColor Cyan
        Write-Host "Your app store conversations are posting to THIS Discord channel above." -ForegroundColor Yellow
        Write-Host "`nOptions:" -ForegroundColor White
        Write-Host "1. Check that Discord channel - your messages might be there!" -ForegroundColor Green
        Write-Host "2. OR re-register with your preferred Discord channel:" -ForegroundColor Yellow
        Write-Host "   https://discomi-mvp-ochre.vercel.app/setup?uid=$appStoreUID" -ForegroundColor Cyan
    } else {
        Write-Host "`n❌ Not registered! You need to register this UID." -ForegroundColor Red
        Write-Host "`nGo to:" -ForegroundColor Yellow
        Write-Host "https://discomi-mvp-ochre.vercel.app/setup?uid=$appStoreUID" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n=== Your UIDs ===" -ForegroundColor Cyan
Write-Host "Developer UID: W7xTEw3Yjde3XSbUyS0ZSNlcb852" -ForegroundColor Gray
Write-Host "App Store UID: GPW9BKkHYWMkGTv3iSndMRAPS2B2" -ForegroundColor Yellow
Write-Host "`nThe app store uses: GPW9BKkHYWMkGTv3iSndMRAPS2B2" -ForegroundColor White
