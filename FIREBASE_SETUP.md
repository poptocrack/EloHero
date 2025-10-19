# 🔥 Firebase Setup Guide for EloHero

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter project name: `elohero` (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create project"

## Step 2: Enable Required Services

### Authentication

1. In Firebase Console, go to "Authentication" → "Sign-in method"
2. Enable the following providers:
   - **Email/Password**: Click "Email/Password" → Enable → Save
   - **Google**: Click "Google" → Enable → Add your project support email → Save
   - **Apple** (iOS only): Click "Apple" → Enable → Configure with your Apple Developer account

### Firestore Database

1. Go to "Firestore Database" → "Create database"
2. Choose "Start in production mode" (we'll add rules later)
3. Select a location close to your users
4. Click "Done"

### Cloud Functions

1. Go to "Functions" → "Get started"
2. Upgrade to Blaze plan (required for Cloud Functions)
3. Click "Continue"

## Step 3: Get Firebase Configuration

1. Go to Project Settings (gear icon) → "General" tab
2. Scroll down to "Your apps" section
3. Click "Add app" → Web app (</>) icon
4. Register app name: `EloHero Web`
5. Copy the Firebase configuration object

## Step 4: Configure Environment Variables

Create a `.env` file in your project root with the following content:

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key-here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# App Configuration
EXPO_PUBLIC_APP_ENV=development
```

Replace the values with your actual Firebase configuration.

## Step 5: Deploy Firestore Rules

1. Install Firebase CLI:

   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:

   ```bash
   firebase login
   ```

3. Initialize Firebase in your project:

   ```bash
   firebase init
   ```

   Select:

   - ✅ Firestore: Configure security rules and indexes files
   - ✅ Functions: Configure a Cloud Functions directory
   - ✅ Hosting: Configure files for Firebase Hosting (optional)

4. Deploy Firestore rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

## Step 6: Deploy Cloud Functions

1. Install dependencies:

   ```bash
   cd functions
   npm install
   ```

2. Build and deploy functions:
   ```bash
   cd ..
   firebase deploy --only functions
   ```

## Step 7: Configure Firestore Indexes

Deploy the indexes:

```bash
firebase deploy --only firestore:indexes
```

## Step 8: Test the Setup

1. Start your Expo app:

   ```bash
   npm start
   ```

2. Try to create an account - you should see the authentication working
3. Check Firebase Console → Authentication to see the new user
4. Check Firestore Database to see the user document created

## Step 9: Configure Custom Claims (Optional)

For premium features, you'll need to set up custom claims:

1. Go to Firebase Console → Authentication → Users
2. Click on a user → Custom claims
3. Add: `{"plan": "premium"}` for premium users

## Troubleshooting

### Common Issues:

1. **"Component auth has not been registered yet"**

   - Make sure your `.env` file is properly configured
   - Restart your Expo development server
   - Check that Firebase project is active

2. **"Permission denied" errors**

   - Make sure Firestore rules are deployed
   - Check that the user is authenticated
   - Verify the user has the correct permissions

3. **Cloud Functions not working**

   - Make sure functions are deployed: `firebase deploy --only functions`
   - Check Firebase Console → Functions for error logs
   - Verify the functions region matches your app configuration

4. **Authentication not working**
   - Check that the sign-in methods are enabled in Firebase Console
   - Verify the API keys are correct in your `.env` file
   - Make sure the bundle ID matches your Firebase app configuration

### Development vs Production:

- **Development**: Uses Firebase emulators (if configured)
- **Production**: Uses live Firebase services

To use emulators in development:

```bash
firebase emulators:start
```

## Security Checklist

- ✅ Firestore rules are deployed and restrictive
- ✅ Authentication methods are properly configured
- ✅ Cloud Functions have proper error handling
- ✅ User data is validated on the server side
- ✅ Plan limits are enforced in Cloud Functions

## Next Steps

1. Set up Stripe for payments (optional)
2. Configure Sentry for error monitoring (optional)
3. Set up automated testing
4. Configure CI/CD pipeline

## Support

If you encounter issues:

1. Check the Firebase Console for error logs
2. Review the Firebase documentation
3. Check the EloHero GitHub issues
4. Contact support@elohero.app
