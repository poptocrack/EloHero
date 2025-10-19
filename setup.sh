#!/bin/bash

# EloHero Setup Script
echo "🚀 Setting up EloHero..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install Firebase CLI if not already installed
if ! command -v firebase &> /dev/null; then
    echo "🔥 Installing Firebase CLI..."
    npm install -g firebase-tools
fi

# Install EAS CLI if not already installed
if ! command -v eas &> /dev/null; then
    echo "📱 Installing EAS CLI..."
    npm install -g @expo/eas-cli
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << EOL
# Firebase Configuration
# Get these values from your Firebase project settings
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key-here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# Sentry Configuration (Optional)
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn-here

# Stripe Configuration (Optional)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-key-here

# App Configuration
EXPO_PUBLIC_APP_ENV=development
EOL
    echo "✅ Created .env file. Please update it with your Firebase configuration."
fi

# Install Cloud Functions dependencies
if [ -d "functions" ]; then
    echo "⚡ Installing Cloud Functions dependencies..."
    cd functions
    npm install
    cd ..
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Follow the FIREBASE_SETUP.md guide to configure Firebase"
echo "2. Update your .env file with Firebase credentials"
echo "3. Run 'firebase login' to authenticate with Firebase"
echo "4. Run 'firebase deploy --only firestore:rules' to deploy Firestore rules"
echo "5. Run 'firebase deploy --only functions' to deploy Cloud Functions"
echo "6. Run 'npm start' to start the development server"
echo ""
echo "📚 Documentation:"
echo "- README.md - Project overview"
echo "- SETUP.md - Detailed setup instructions"
echo "- FIREBASE_SETUP.md - Firebase configuration guide"
echo ""
echo "🎉 Happy coding!"
