# EloHero Setup Guide

## 🚀 Quick Start

### 1. Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id

# Sentry Configuration (Optional)
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn

# Stripe Configuration (Optional)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key

# App Configuration
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_URL=https://your-region-your-project.cloudfunctions.net
```

### 2. Firebase Setup

1. **Create Firebase Project**

   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Authentication, Firestore, and Functions

2. **Configure Authentication**

   - Enable Email/Password authentication
   - Enable Google Sign-In
   - Enable Apple Sign-In (iOS only)

3. **Setup Firestore**

   - Create database in production mode
   - Configure security rules (see below)

4. **Deploy Cloud Functions**

   ```bash
   # Install Firebase CLI
   npm install -g firebase-tools

   # Login to Firebase
   firebase login

   # Initialize Firebase in your project
   firebase init functions

   # Deploy functions
   firebase deploy --only functions
   ```

### 3. Firestore Security Rules

Add these rules to your Firestore database:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Groups are readable by members, writable by owners
    match /groups/{groupId} {
      allow read: if request.auth != null &&
        exists(/databases/$(database)/documents/members/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/members/$(request.auth.uid)).data.groupId == groupId;
      allow write: if request.auth != null &&
        resource.data.ownerId == request.auth.uid;
    }

    // Members can read their own membership
    match /members/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
    }

    // Seasons are readable by group members
    match /seasons/{seasonId} {
      allow read: if request.auth != null &&
        exists(/databases/$(database)/documents/members/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/members/$(request.auth.uid)).data.groupId == resource.data.groupId;
    }

    // Ratings are readable by group members
    match /ratings/{ratingId} {
      allow read: if request.auth != null &&
        exists(/databases/$(database)/documents/members/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/members/$(request.auth.uid)).data.groupId == resource.data.groupId;
    }

    // Games are readable by group members
    match /games/{gameId} {
      allow read: if request.auth != null &&
        exists(/databases/$(database)/documents/members/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/members/$(request.auth.uid)).data.groupId == resource.data.groupId;
    }

    // Participants are readable by group members
    match /participants/{participantId} {
      allow read: if request.auth != null &&
        exists(/databases/$(database)/documents/members/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/members/$(request.auth.uid)).data.groupId == resource.data.groupId;
    }

    // Rating changes are readable by the user
    match /ratingChanges/{ratingChangeId} {
      allow read: if request.auth != null &&
        resource.data.uid == request.auth.uid;
    }

    // Invites are readable by anyone with the code
    match /invites/{code} {
      allow read: if request.auth != null;
    }

    // Subscriptions are readable by the user
    match /subscriptions/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 4. Cloud Functions

The following Cloud Functions need to be implemented and deployed:

#### Required Functions:

- `createGroup` - Create a new group
- `joinGroupWithCode` - Join group with invitation code
- `createSeason` - Create a new season (Premium only)
- `reportMatch` - Report a match and calculate ELO
- `generateInviteCode` - Generate invitation code
- `leaveGroup` - Leave a group
- `deleteGroup` - Delete a group (owner only)
- `updateGroup` - Update group settings
- `endSeason` - End current season
- `resetSeasonRatings` - Reset ratings for a season

#### Optional Functions:

- `stripeWebhook` - Handle Stripe webhooks
- `scheduledCleanups` - Clean up expired invites

### 5. Stripe Setup (Optional)

1. **Create Stripe Account**

   - Sign up at [Stripe](https://stripe.com/)
   - Get your publishable and secret keys

2. **Install Stripe Extension**

   - Go to Firebase Console > Extensions
   - Install "Stripe Payments" extension
   - Configure with your Stripe keys

3. **Configure Webhooks**
   - Add webhook endpoint in Stripe dashboard
   - Point to your `stripeWebhook` Cloud Function

### 6. Run the App

```bash
# Install dependencies
npm install

# Start the development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

### 7. Build for Production

```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

## 🔧 Troubleshooting

### Common Issues:

1. **Firebase connection errors**

   - Check your Firebase configuration
   - Ensure all environment variables are set
   - Verify Firebase project is active

2. **Authentication not working**

   - Check Firebase Auth providers are enabled
   - Verify bundle ID matches Firebase configuration
   - Check for typos in environment variables

3. **Cloud Functions not responding**

   - Ensure functions are deployed
   - Check function logs in Firebase Console
   - Verify function permissions

4. **Build errors**
   - Clear Expo cache: `expo start -c`
   - Delete node_modules and reinstall
   - Check for dependency conflicts

## 📱 Testing

### Test Plan:

1. **Authentication**

   - Sign up with email
   - Sign in with Google/Apple
   - Sign out functionality

2. **Group Management**

   - Create a group
   - Join group with code
   - Leave group
   - Delete group (owner)

3. **Match Entry**

   - Select players
   - Drag and drop ordering
   - Submit match

4. **ELO Calculation**

   - Verify ELO updates
   - Check ranking display
   - Test rating history

5. **Premium Features**
   - Create seasons
   - Reset ratings
   - Check plan limits

## 🚀 Deployment

### App Store / Google Play:

1. Build production versions
2. Test thoroughly
3. Submit for review
4. Monitor crash reports

### OTA Updates:

```bash
# Deploy update
eas update --branch production --message "Bug fixes and improvements"
```

## 📞 Support

For issues or questions:

- Check the README.md
- Review Firebase documentation
- Open an issue on GitHub
- Contact support@elohero.app
