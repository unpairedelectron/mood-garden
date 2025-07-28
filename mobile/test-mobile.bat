@echo off
echo 🧪 MoodGarden Mobile Testing Suite 🧪
echo.

:menu
echo Select testing method:
echo 1) Start Expo Dev Server (scan QR with Expo Go app)
echo 2) Test on Android Emulator
echo 3) Test on connected Android device
echo 4) Build Preview APK for manual testing
echo 5) Test web version on mobile browser
echo 6) Exit
echo.

set /p choice="Enter your choice (1-6): "

if "%choice%"=="1" (
    echo Starting Expo development server...
    echo.
    echo 📱 Next steps:
    echo 1. Install 'Expo Go' app on your phone
    echo 2. Scan the QR code that appears
    echo 3. Your app will load instantly!
    echo.
    npx expo start
    goto menu
)

if "%choice%"=="2" (
    echo Starting Android emulator...
    echo.
    echo 📱 Make sure you have Android Studio emulator running
    echo.
    npx expo start --android
    goto menu
)

if "%choice%"=="3" (
    echo Testing on connected device...
    echo.
    echo 📱 Make sure:
    echo - USB debugging is enabled
    echo - Device is connected via USB
    echo - Device is trusted
    echo.
    npx expo start --android
    goto menu
)

if "%choice%"=="4" (
    echo Building preview APK...
    echo.
    echo 📦 This will create an APK you can install on any Android device
    echo ⏰ Build time: 5-10 minutes
    echo.
    eas build --platform android --profile preview
    goto menu
)

if "%choice%"=="5" (
    echo Testing web version...
    echo.
    echo 🌐 Opening web version for mobile browser testing
    echo 📱 Open this URL on your phone browser:
    echo.
    cd ..
    npm run dev
    goto menu
)

if "%choice%"=="6" (
    echo Goodbye! Happy testing! 🌿✨
    exit /b 0
)

echo Invalid choice. Please try again.
goto menu
