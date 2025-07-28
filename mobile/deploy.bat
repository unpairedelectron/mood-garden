@echo off
REM 🌿 MoodGarden Mobile Deployment Script for Windows 🌿

echo 🌿 Starting MoodGarden Mobile Deployment... 🌿

REM Check if we're in the mobile directory
if not exist "app.json" (
    echo [ERROR] Please run this script from the mobile directory
    pause
    exit /b 1
)

REM Check if EAS CLI is installed
eas --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] EAS CLI not found. Installing...
    npm install -g @expo/eas-cli
)

REM Check if user is logged in to Expo
echo [INFO] Checking Expo authentication...
eas whoami >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Not logged in to Expo. Please login:
    eas login
)

REM Install dependencies
echo [INFO] Installing dependencies...
npm install

REM Prompt for build type
echo.
echo Select deployment type:
echo 1) Development build (for testing)
echo 2) Preview build (APK for testing)
echo 3) Production build (AAB for Play Store)
echo 4) Full deployment (build + submit to Play Store)
echo.

set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" (
    echo [INFO] Building development version...
    eas build --platform android --profile development
) else if "%choice%"=="2" (
    echo [INFO] Building preview APK...
    eas build --platform android --profile preview
    echo [SUCCESS] Preview APK build started. You can install this on test devices.
) else if "%choice%"=="3" (
    echo [INFO] Building production AAB...
    eas build --platform android --profile production
    echo [SUCCESS] Production AAB build started. Upload this to Google Play Console.
) else if "%choice%"=="4" (
    echo [INFO] Building and submitting to Play Store...
    
    echo [INFO] Step 1: Building production AAB...
    eas build --platform android --profile production
    
    echo [INFO] Step 2: Submitting to Play Store...
    echo [WARNING] Note: First submission must be done manually through Play Console
    echo [WARNING] Subsequent updates can use: eas submit --platform android
    
    set /p submit_choice="Do you want to submit to Play Store now? (y/n): "
    if /i "%submit_choice%"=="y" (
        eas submit --platform android
    ) else (
        echo [INFO] Build complete. You can submit later with: eas submit --platform android
    )
) else (
    echo [ERROR] Invalid choice. Please run the script again.
    pause
    exit /b 1
)

echo.
echo [SUCCESS] 🌿 MoodGarden deployment process completed! 🌿
echo.
echo Next steps:
echo • Check build status: https://expo.dev/accounts/[your-account]/projects/mood-garden-zen/builds
echo • For Play Store: https://play.google.com/console
echo • Monitor app performance in Play Console analytics
echo.
echo Happy gardening! 🌱✨
pause
