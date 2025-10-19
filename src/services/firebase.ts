// Firebase Configuration and Services
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Firebase configuration
const firebaseConfig = {
  apiKey:
    Constants.expoConfig?.extra?.firebaseApiKey ||
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ||
    'demo-key',
  authDomain:
    Constants.expoConfig?.extra?.firebaseAuthDomain ||
    process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    'demo-project.firebaseapp.com',
  projectId:
    Constants.expoConfig?.extra?.firebaseProjectId ||
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
    'demo-project',
  storageBucket:
    Constants.expoConfig?.extra?.firebaseStorageBucket ||
    process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'demo-project.appspot.com',
  messagingSenderId:
    Constants.expoConfig?.extra?.firebaseMessagingSenderId ||
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    '123456789',
  appId:
    Constants.expoConfig?.extra?.firebaseAppId ||
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ||
    'demo-app-id'
};

// Initialize Firebase (only if not already initialized)
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Auth with AsyncStorage persistence
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  // Auth already initialized
  auth = getAuth(app);
}

// Initialize Firestore
const db = getFirestore(app);

// Initialize Functions
const functions = getFunctions(app);

// Connect to emulators in development
if (__DEV__) {
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectFunctionsEmulator(functions, 'localhost', 5001);
  } catch (error) {
    // Emulators already connected or not available
    console.log('Firebase emulators not available or already connected');
  }
}

export { auth, db, functions };
export default app;
