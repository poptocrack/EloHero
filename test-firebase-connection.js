#!/usr/bin/env node

/**
 * Simple Firebase connection test script
 * Run this to verify your Firebase configuration is working
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, connectFirestoreEmulator } = require('firebase/firestore');

// Your Firebase config from app.json
const firebaseConfig = {
  apiKey: "AIzaSyASlpzKNXuR9X8jnRjmZd4Sq4kQwBQs7JI",
  authDomain: "elohero.firebaseapp.com",
  projectId: "elohero",
  storageBucket: "elohero.firebasestorage.app",
  messagingSenderId: "100850883969",
  appId: "1:100850883969:web:f9e4f7af24d7cb8ce25c80"
};

async function testConnection() {
  console.log('🔥 Testing Firebase connection...');
  console.log('Project ID:', firebaseConfig.projectId);

  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);

    console.log('✅ Firebase initialized successfully');
    console.log('✅ Firestore instance created');

    // Test a simple read operation
    const { collection, getDocs } = require('firebase/firestore');
    const testCollection = collection(db, 'test');

    console.log('🔄 Testing Firestore read operation...');
    const snapshot = await getDocs(testCollection);
    console.log('✅ Firestore read operation successful');
    console.log(`📊 Found ${snapshot.size} documents in test collection`);

    console.log('\n🎉 Firebase connection test PASSED!');
    console.log('Your app should now work on physical devices.');

  } catch (error) {
    console.error('❌ Firebase connection test FAILED:');
    console.error(error.message);

    if (error.code === 'unavailable') {
      console.log('\n💡 This might be a network connectivity issue.');
      console.log('Make sure you have internet access and try again.');
    } else if (error.code === 'permission-denied') {
      console.log('\n💡 This might be a Firestore rules issue.');
      console.log('Check your Firestore security rules.');
    }
  }
}

// Run the test
testConnection().catch(console.error);
