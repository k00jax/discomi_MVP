# Quick Environment Variable Diagnostic
Write-Host "Environment Check Results:" -ForegroundColor Cyan
Write-Host ""

try {
    $result = Invoke-RestMethod -Uri "https://discomi-mvp-ochre.vercel.app/api/envcheck"
    
    # Admin API Key Check
    if ($result.has_ADMIN_API_KEY) {
        Write-Host "[OK] ADMIN_API_KEY: SET" -ForegroundColor Green
        Write-Host "     Length: $($result.ADMIN_API_KEY_len) characters" -ForegroundColor White
        
        if ($result.ADMIN_API_KEY_len -ne 32) {
            Write-Host "[WARN] Expected 32 characters!" -ForegroundColor Yellow
            Write-Host "       Your local key is 32 chars: o9ijpJNU1zY2cTKhkRQsO3y6VDftdwmg" -ForegroundColor Gray
            Write-Host "       Vercel has $($result.ADMIN_API_KEY_len) chars - might have quotes or whitespace" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "Fix it:" -ForegroundColor Cyan
            Write-Host "  vercel env rm ADMIN_API_KEY production" -ForegroundColor Gray
            Write-Host "  echo o9ijpJNU1zY2cTKhkRQsO3y6VDftdwmg | vercel env add ADMIN_API_KEY production" -ForegroundColor Gray
            Write-Host "  vercel --prod --force" -ForegroundColor Gray
        }
    } else {
        Write-Host "[ERROR] ADMIN_API_KEY: NOT SET" -ForegroundColor Red
    }
    
    Write-Host ""
    
    # Supabase URL Check
    if ($result.has_SUPABASE_URL) {
        Write-Host "[OK] SUPABASE_URL: SET" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] SUPABASE_URL: NOT SET" -ForegroundColor Red
    }
    
    # Supabase Service Role Check
    if ($result.has_SUPABASE_SERVICE_ROLE) {
        Write-Host "[OK] SUPABASE_SERVICE_ROLE: SET" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] SUPABASE_SERVICE_ROLE: NOT SET" -ForegroundColor Red
    }
    
    Write-Host ""
    
    # USE_SUPABASE Check
    Write-Host "USE_SUPABASE: " -NoNewline -ForegroundColor Yellow
    if ($result.USE_SUPABASE -eq "true") {
        Write-Host "true" -ForegroundColor Green
    } elseif ($result.USE_SUPABASE -eq "false") {
        Write-Host "false" -ForegroundColor Red
        Write-Host "  Fix: Set USE_SUPABASE=true in Vercel" -ForegroundColor Yellow
    } else {
        Write-Host "NOT SET" -ForegroundColor Red
        Write-Host "  Fix: echo true | vercel env add USE_SUPABASE production" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Build ID: $($result.build)" -ForegroundColor Gray
    
} catch {
    Write-Host "[ERROR] Failed to check environment!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
}
