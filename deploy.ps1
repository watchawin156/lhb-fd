# ===================================================
# deploy.ps1 — Build + Git + Cloudflare Pages
# โรงเรียนบ้านละหอกตะแบง Finance Dashboard
# ===================================================

$ErrorActionPreference = "Stop"
$ProjectDir = $PSScriptRoot

Write-Host "`n=== [1/5] Build Vite project ===" -ForegroundColor Cyan
Set-Location $ProjectDir
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Build failed!"; exit 1 }
Write-Host "Build OK" -ForegroundColor Green

Write-Host "`n=== [2/5] Git init / commit ===" -ForegroundColor Cyan
# Init git ถ้ายังไม่มี
if (-not (Test-Path ".git")) {
    git init
    git branch -M main
    Write-Host "Git initialized" -ForegroundColor Green
} else {
    Write-Host "Git already initialized" -ForegroundColor Yellow
}

git add -A
git status --short

$CommitMsg = "deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
git commit -m $CommitMsg
Write-Host "Committed: $CommitMsg" -ForegroundColor Green

Write-Host "`n=== [3/5] Push to GitHub (lhb-fd) ===" -ForegroundColor Cyan
# ตรวจว่ามี remote origin ยัง
$remotes = git remote
if ($remotes -contains "origin") {
    Write-Host "Remote 'origin' found, pushing..." -ForegroundColor Yellow
    git push -u origin main
} else {
    Write-Host "No remote found. Please add GitHub remote first:" -ForegroundColor Red
    Write-Host "  git remote add origin https://github.com/YOUR_USERNAME/lhb-fd.git" -ForegroundColor White
    Write-Host "  Then re-run this script." -ForegroundColor White
    Write-Host "`n(Continuing to Cloudflare deploy anyway...)" -ForegroundColor Yellow
}

Write-Host "`n=== [4/5] Deploy to Cloudflare Pages ===" -ForegroundColor Cyan
# ตรวจว่า wrangler ติดตั้งแล้วหรือยัง
$wranglerExists = Get-Command wrangler -ErrorAction SilentlyContinue
if (-not $wranglerExists) {
    Write-Host "Installing wrangler globally..." -ForegroundColor Yellow
    npm install -g wrangler
}

wrangler pages deploy dist --project-name lhb-fd
if ($LASTEXITCODE -ne 0) {
    Write-Error "Cloudflare Pages deploy failed!"
    exit 1
}

Write-Host "`n=== [5/5] Deploy Complete! ===" -ForegroundColor Green
Write-Host "Your app is live at: https://lhb-fd.pages.dev" -ForegroundColor Cyan
Write-Host "GitHub repo: https://github.com/YOUR_USERNAME/lhb-fd" -ForegroundColor Cyan
