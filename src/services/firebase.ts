// Firebase Configuration and Services
import { initializeApp, getApps } from 'firebase/app';
// @ts-expect-error
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

// Log Firebase configuration status (without sensitive data)
console.log('Firebase Config Status:', {
  hasApiKey: !!firebaseConfig.apiKey && firebaseConfig.apiKey !== 'demo-key',
  hasProjectId: !!firebaseConfig.projectId && firebaseConfig.projectId !== 'demo-project',
  hasAppId: !!firebaseConfig.appId && firebaseConfig.appId !== 'demo-app-id',
  projectId: firebaseConfig.projectId
});

// Initialize Firebase (only if not already initialized)
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Auth
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
      console.log('Connected to Firestore emulator at', EMULATOR_HOST);
    } catch (error) {
      console.log(
        'Firestore emulator not available or already connected:',
        (error as Error).message
      );
    }

    try {
      connectFunctionsEmulator(functions, EMULATOR_HOST, 5001);
      console.log('Connected to Functions emulator at', EMULATOR_HOST);
    } catch (error) {
      console.log(
        'Functions emulator not available or already connected:',
        (error as Error).message
      );
    }
  } else {
    console.log('Running on physical device - using production Firebase');
  }
}

export { auth, db, functions };
export default app;
