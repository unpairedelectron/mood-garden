# 📱 Android Emulator Setup Guide

## Method 1: Android Studio Emulator (Recommended)

### 1. Install Android Studio
- Download from: https://developer.android.com/studio
- Install with default settings
- Open Android Studio

### 2. Setup Virtual Device
1. Open Android Studio
2. Click "More Actions" → "Virtual Device Manager"
3. Click "Create Device"
4. Choose "Phone" → "Pixel 7" (or similar)
5. Download system image (API 33/34 recommended)
6. Click "Finish"

### 3. Start Emulator
1. Click ▶️ play button next to your virtual device
2. Wait for Android to boot up
3. You now have a virtual Android phone!

### 4. Run Your App
```bash
# In your mobile directory
npx expo start --android
```

## Method 2: Quick Online Testing (BlueStacks/Genymotion)

### BlueStacks (Free, Easy)
1. Download BlueStacks: https://www.bluestacks.com/
2. Install and start
3. Install Expo Go from Play Store in BlueStacks
4. Scan QR code from your Expo dev server

### Genymotion (Professional)
1. Sign up at: https://www.genymotion.com/
2. Download Genymotion Personal (free)
3. Create virtual device
4. Install Expo Go APK

## Method 3: Physical Device Testing

### USB Debugging (Most Accurate)
1. Enable Developer Options on your Android phone:
   - Settings → About Phone → Tap "Build Number" 7 times
2. Enable USB Debugging:
   - Settings → Developer Options → USB Debugging
3. Connect phone via USB
4. Run: `npx expo start --android`

## Recommended Testing Sequence

1. **Expo Go** (5 min) - Quick feature test
2. **Android Emulator** (30 min) - Realistic UI/UX testing  
3. **Physical Device** (15 min) - Final performance validation
4. **APK Build** (1 hour) - Production-like testing

## What to Test

### ✅ Core Functionality
- App launches without crashes
- Navigation works smoothly
- Garden renders properly
- Touch interactions respond

### ✅ Mobile-Specific Features  
- Camera permissions and functionality
- Microphone for voice input
- Device orientation changes
- Back button behavior
- Performance on lower-end devices

### ✅ User Experience
- Loading times
- Smooth animations
- Text readability on small screens
- Button sizes (touch-friendly)
- Garden interactions feel natural

### ✅ Edge Cases
- App behavior when interrupted (calls, notifications)
- Network connectivity changes
- Device storage limitations
- Different screen sizes and densities

## Performance Testing

### Memory Usage
- Monitor RAM usage during garden interactions
- Check for memory leaks during extended use
- Test particle system performance

### Battery Impact
- Run app for 30+ minutes
- Monitor battery drain
- Test background behavior

### Network Usage
- Test with slow internet
- Test offline functionality
- Monitor data usage

## Bug Reporting Template

Create a simple bug tracking doc:

```
Bug: [Brief Description]
Device: [Phone Model/Emulator]
OS: Android [Version]
Steps to Reproduce:
1. 
2. 
3. 

Expected: [What should happen]
Actual: [What actually happened]
Severity: High/Medium/Low
Screenshot: [If applicable]
```

## Quick Testing Checklist

Before Play Store submission:

- [ ] App launches successfully
- [ ] All navigation works
- [ ] Garden loads and renders
- [ ] Touch interactions work
- [ ] Voice input functions
- [ ] Camera integration works
- [ ] No crashes during normal use
- [ ] Animations are smooth
- [ ] Text is readable on small screens
- [ ] Performance is acceptable
- [ ] Back button works correctly
- [ ] App handles interruptions gracefully

Ready to test! 📱✨
