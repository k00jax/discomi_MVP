# Test script to analyze Transcript Processed payload structure

Write-Host "=== Analyze Transcript Processed Payload ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Instructions:" -ForegroundColor Yellow
Write-Host "1. Set trigger to 'Transcript Processed'" -ForegroundColor White
Write-Host "2. Start recording in Omi" -ForegroundColor White
Write-Host "3. Speak for 10-15 seconds" -ForegroundColor White
Write-Host "4. Stop recording" -ForegroundColor White
Write-Host "5. Check Vercel logs for full payload dumps" -ForegroundColor White
Write-Host ""
Write-Host "Look for these patterns in the logs:" -ForegroundColor Cyan
Write-Host "- Is there a 'is_final' or 'completed' flag?" -ForegroundColor White
Write-Host "- Does the segments array grow over time?" -ForegroundColor White
Write-Host "- Are there different payload structures for intermediate vs final?" -ForegroundColor White
Write-Host "- Is there a timestamp or sequence number?" -ForegroundColor White
Write-Host ""
Write-Host "DEBUG mode is enabled, so full payloads will be logged." -ForegroundColor Green
Write-Host "Vercel logs: https://vercel.com/k00jax/discomi-mvp/logs" -ForegroundColor Cyan
