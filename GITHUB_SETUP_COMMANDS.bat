@echo off
echo ============================================
echo  🚀 MoodGarden GitHub Setup Script
echo ============================================
echo.

REM Check if git is available
git --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Error: Git is not installed or not in PATH
    echo Please install Git from https://git-scm.com/
    echo.
    pause
    exit /b 1
)

echo ✅ Git found! Current status:
git status --porcelain
echo.

echo 📋 IMPORTANT: Before running this script:
echo 1. Go to https://github.com/unpairedelectron
echo 2. Click "New" to create a repository
echo 3. Name it: mood-garden
echo 4. Make it Public
echo 5. DO NOT add README, .gitignore, or license
echo 6. Click "Create repository"
echo.
echo Press any key when you've created the repository...
pause >nul

echo.
echo 🔗 Adding GitHub remote repository...
git remote add origin https://github.com/unpairedelectron/mood-garden.git

if errorlevel 1 (
    echo Remote might already exist, removing and re-adding...
    git remote remove origin
    git remote add origin https://github.com/unpairedelectron/mood-garden.git
)

echo.
echo 📡 Checking remote configuration...
git remote -v

echo.
echo 🌿 Setting main branch...
git branch -M main

echo.
echo 📤 Pushing to GitHub...
echo.
echo 🔐 AUTHENTICATION REQUIRED:
echo Username: unpairedelectron
echo Password: Use your GitHub Personal Access Token
echo (NOT your regular GitHub password)
echo.

git push -u origin main

if errorlevel 0 (
    echo.
    echo ================================================
    echo  ✅ SUCCESS! MoodGarden is now on GitHub!
    echo ================================================
    echo.
    echo 🌐 Repository URL: 
    echo https://github.com/unpairedelectron/mood-garden
    echo.
    echo 📋 What you can do now:
    echo - View your code on GitHub
    echo - Share the repository with others
    echo - Set up GitHub Pages for hosting
    echo - Create issues and milestones
    echo - Set up GitHub Actions for CI/CD
    echo.
) else (
    echo.
    echo ================================================
    echo  ❌ Push failed - Troubleshooting:
    echo ================================================
    echo.
    echo 🔍 Common solutions:
    echo 1. Make sure the repository exists on GitHub
    echo 2. Check your internet connection
    echo 3. Verify your GitHub username/token
    echo 4. Try running: git push --force origin main
    echo.
    echo 📖 See GITHUB_SETUP_GUIDE.md for detailed help
)

echo.
echo Press any key to exit...
pause >nul
