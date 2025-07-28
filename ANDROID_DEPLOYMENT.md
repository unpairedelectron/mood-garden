# 📱 MoodGarden Android Deployment Guide

## Prerequisites

### 1. Install Required Tools
```bash
# Install EAS CLI (Expo Application Services)
npm install -g @expo/eas-cli

# Install Expo CLI
npm install -g @expo/cli
```

### 2. Create Expo Account
```bash
# Login to Expo
npx expo login
```

## Phase 1: Mobile App Preparation

### 1. Navigate to Mobile Directory
```bash
cd mobile
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Test Mobile App Locally
```bash
# Start development server
npx expo start

# Test on Android device/emulator
npx expo start --android

# Test on iOS (if you have Mac)
npx expo start --ios
```

### 4. Update App Icons & Assets

Create these assets in `mobile/assets/`:
- `icon.png` (1024x1024) - App icon
- `adaptive-icon.png` (1024x1024) - Android adaptive icon
- `splash.png` (1284x2778) - Splash screen
- `favicon.png` (48x48) - Web favicon

## Phase 2: Build Configuration

### 1. Initialize EAS Build
```bash
# In mobile directory
eas build:configure
```

### 2. Update Project ID
```bash
# Get your project ID
eas project:info

# Update app.json with the project ID
```

### 3. Configure Build Profiles
Your `eas.json` is already configured with:
- **Development**: For testing
- **Preview**: APK builds for testing
- **Production**: AAB builds for Play Store

## Phase 3: Google Play Store Setup

### 1. Create Google Play Console Account
- Go to [Google Play Console](https://play.google.com/console)
- Pay $25 one-time registration fee
- Complete developer verification

### 2. Create New App
- Click "Create app"
- Fill in app details:
  - App name: "MoodGarden - Zen Wellness Sanctuary"
  - Default language: English (United States)
  - App category: Health & Fitness
  - Content rating: Everyone

### 3. Generate Upload Key
```bash
# Generate keystore (keep this secure!)
keytool -genkeypair -v -storetype PKCS12 -keystore upload-keystore.keystore -alias upload -keyalg RSA -keysize 2048 -validity 10000

# Note: Save the keystore password securely
```

### 4. Configure App Signing
- In Play Console → App integrity → App signing
- Upload your upload certificate
- Google will manage the app signing key

## Phase 4: Build & Deploy

### 1. Build Production APK (for testing)
```bash
eas build --platform android --profile preview
```

### 2. Build Production AAB (for Play Store)
```bash
eas build --platform android --profile production
```

### 3. Download & Test APK
```bash
# Download the APK from the build URL
# Install on test devices to verify functionality
```

### 4. Upload to Play Console

#### A. App Bundle Upload
- Go to Play Console → Production → Create new release
- Upload the AAB file from EAS build
- Add release notes

#### B. Store Listing
- App name: "MoodGarden - Zen Wellness Sanctuary"
- Short description: "Transform your mental wellness with an immersive, AI-powered zen garden sanctuary"
- Full description:
```
🌿 MoodGarden - Your Personal Zen Wellness Sanctuary 🌿

Discover inner peace and emotional wellness through an immersive, interactive zen garden experience. MoodGarden combines cutting-edge AI with mindfulness practices to create your personalized digital sanctuary.

✨ Key Features:
• Walkable 3D zen garden with breathtaking visuals
• AI-powered mood analysis and personalized insights
• Guided breathing exercises and meditation
• Interactive plants that respond to your emotions
• Voice mood input with sentiment analysis
• Progress tracking and wellness achievements
• Dynamic weather and day/night cycles
• Soothing ambient sounds and music

🧘‍♀️ Perfect For:
• Stress relief and anxiety management
• Daily mindfulness practice
• Emotional wellness tracking
• Mental health support
• Meditation and relaxation

Transform your smartphone into a gateway to tranquility. Your journey to better mental wellness starts here.
```

#### C. Graphics & Screenshots
- App icon (512x512)
- Feature graphic (1024x500)
- Screenshots (at least 2, up to 8)
- Phone screenshots (16:9 or 9:16 ratio)

#### D. Content Rating
- Complete the content rating questionnaire
- Should receive "Everyone" rating

#### E. App Access
- All functionality is available without restrictions
- No special access needed

#### F. Ads & In-App Purchases
- Configure if you plan to monetize
- For wellness app, consider premium features

### 5. Privacy Policy & Data Safety

Create privacy policy covering:
- Mood data collection
- Voice recording storage
- Location data (if used)
- Analytics and crash reporting
- Data sharing with third parties

Required sections for Data Safety:
- Data types collected
- How data is used
- Data sharing practices
- Security practices

## Phase 5: Testing & Release

### 1. Internal Testing
```bash
# Upload to internal testing track
eas submit --platform android --track internal
```

### 2. Alpha Testing
- Add alpha testers via email
- Test all core features
- Gather feedback

### 3. Beta Testing (Optional)
- Open beta or closed beta
- Broader testing group
- Final bug fixes

### 4. Production Release
- Review all store listing details
- Submit for review
- Release to production (can be gradual)

## Phase 6: Post-Launch

### 1. Monitor Performance
- Play Console analytics
- Crash reports
- User reviews and ratings

### 2. Updates
```bash
# For app updates, increment version
# In app.json: version: "1.0.1", versionCode: 2
eas build --platform android --profile production
```

### 3. Marketing
- App Store Optimization (ASO)
- Social media promotion
- Mental health communities
- Wellness blogs and reviews

## Automation Script

Create `deploy.sh` in mobile directory:
```bash
#!/bin/bash
echo "🌿 MoodGarden Deployment Script 🌿"

# Build for Android
echo "Building Android AAB..."
eas build --platform android --profile production --non-interactive

# Submit to Play Store (after first manual upload)
echo "Submitting to Play Store..."
eas submit --platform android --track production --non-interactive

echo "✅ Deployment complete!"
echo "Check Play Console for review status"
```

## Estimated Timeline

- **Setup & Configuration**: 1-2 days
- **Google Play Console Setup**: 1 day
- **Initial Build & Testing**: 2-3 days
- **Store Listing Creation**: 1 day
- **Google Review Process**: 1-7 days
- **Total**: 1-2 weeks

## Costs

- **Google Play Console**: $25 (one-time)
- **EAS Build**: Free tier (limited builds) or $29/month
- **Optional**: Play Console Developer Support

## Tips for Success

1. **Test Thoroughly**: Use preview builds extensively
2. **Follow Guidelines**: Review Google Play policies
3. **Optimize Listing**: Use relevant keywords for ASO
4. **Quality Screenshots**: Show key features clearly
5. **Responsive Support**: Monitor reviews and respond
6. **Regular Updates**: Keep app fresh with new features

Your MoodGarden app is well-positioned for success in the wellness category! 🌱✨
