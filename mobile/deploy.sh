#!/bin/bash

# 🌿 MoodGarden Mobile Deployment Script 🌿
echo "🌿 Starting MoodGarden Mobile Deployment... 🌿"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the mobile directory
if [ ! -f "app.json" ]; then
    print_error "Please run this script from the mobile directory"
    exit 1
fi

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    print_warning "EAS CLI not found. Installing..."
    npm install -g @expo/eas-cli
fi

# Check if user is logged in to Expo
print_status "Checking Expo authentication..."
if ! eas whoami &> /dev/null; then
    print_warning "Not logged in to Expo. Please login:"
    eas login
fi

# Install dependencies
print_status "Installing dependencies..."
npm install

# Prompt for build type
echo ""
echo "Select deployment type:"
echo "1) Development build (for testing)"
echo "2) Preview build (APK for testing)"
echo "3) Production build (AAB for Play Store)"
echo "4) Full deployment (build + submit to Play Store)"

read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        print_status "Building development version..."
        eas build --platform android --profile development
        ;;
    2)
        print_status "Building preview APK..."
        eas build --platform android --profile preview
        print_success "Preview APK build started. You can install this on test devices."
        ;;
    3)
        print_status "Building production AAB..."
        eas build --platform android --profile production
        print_success "Production AAB build started. Upload this to Google Play Console."
        ;;
    4)
        print_status "Building and submitting to Play Store..."
        
        # First build
        print_status "Step 1: Building production AAB..."
        eas build --platform android --profile production
        
        # Then submit (requires initial manual setup)
        print_status "Step 2: Submitting to Play Store..."
        print_warning "Note: First submission must be done manually through Play Console"
        print_warning "Subsequent updates can use: eas submit --platform android"
        
        # Ask if they want to submit now
        read -p "Do you want to submit to Play Store now? (y/n): " submit_choice
        if [ "$submit_choice" = "y" ] || [ "$submit_choice" = "Y" ]; then
            eas submit --platform android
        else
            print_info "Build complete. You can submit later with: eas submit --platform android"
        fi
        ;;
    *)
        print_error "Invalid choice. Please run the script again."
        exit 1
        ;;
esac

print_success "🌿 MoodGarden deployment process completed! 🌿"
echo ""
echo "Next steps:"
echo "• Check build status: https://expo.dev/accounts/[your-account]/projects/mood-garden-zen/builds"
echo "• For Play Store: https://play.google.com/console"
echo "• Monitor app performance in Play Console analytics"
echo ""
echo "Happy gardening! 🌱✨"
