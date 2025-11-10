// Firebase Configuration
// This file should be configured with your actual Firebase project settings

export const firebaseConfig = {
  // Replace these with your actual Firebase project configuration
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || 'your-api-key',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'your-project-id',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'your-project.appspot.com',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || 'your-app-id'
};

// Cloud Functions region
export const functionsRegion = 'us-central1'; // Change to your preferred region

// ELO Configuration
export const eloConfig = {
  kBase: 32,
  n0: 30,
  ratingInit: 1200
};

// App Configuration
export const appConfig = {
  name: 'EloHero',
  version: '1.0.0',
  supportEmail: 'support@elohero.app'
};

