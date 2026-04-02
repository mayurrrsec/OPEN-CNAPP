# One-time GitHub authentication for HTTPS pushes (uses Git Credential Manager).
# Run in PowerShell from any directory:
#   .\scripts\setup-git-auth.ps1
#
# This opens a browser to sign in to GitHub and stores credentials in Windows Credential Manager.
# After this, `git push` / `git pull` work without typing a password each time.

$ErrorActionPreference = "Stop"
Write-Host "Starting GitHub login via Git Credential Manager (browser)..." -ForegroundColor Cyan
git credential-manager github login --browser --username mayurrrsec
Write-Host "Done. Try: git push -u origin <your-branch>" -ForegroundColor Green
