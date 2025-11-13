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
const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

// Initialize Functions
const functions = getFunctions(app);

// Connect to emulators in development (only when running on simulator/emulator)
if (__DEV__) {
  // Check if we're running on a simulator/emulator or physical device
  const isSimulator = Constants.platform?.ios?.simulator || Constants.platform?.android?.emulator;

  // Only connect to emulators if we're on a simulator/emulator
  if (isSimulator) {
    // Use environment variable for emulator host, fallback to localhost
    const EMULATOR_HOST = process.env.EXPO_PUBLIC_EMULATOR_HOST || 'localhost';

    try {
      connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
    } catch (error) {
      // Firestore emulator not available or already connected
    }

    try {
      connectFunctionsEmulator(functions, EMULATOR_HOST, 5001);
    } catch (error) {
      // Functions emulator not available or already connected
    }
  }
}

export { db, functions };
export default app;
