$source = "C:\projects\experiments\paperboy\docs\md-input-samples\2026-04-08-high-agency-in-30-minutes-george-mack.md"
$destination = "C:\Users\nacho\Paperboy"

if (Test-Path $source) {
    Copy-Item -Path $source -Destination $destination -Force
    Write-Host "File copied successfully!" -ForegroundColor Green
} else {
    Write-Warning "Source file not found."
}