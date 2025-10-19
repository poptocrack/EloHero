// Authentication Service
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User, UserPlan } from '../types';

export class AuthService {
  // Sign in with email and password
  static async signInWithEmail(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return await this.getUserData(userCredential.user.uid);
    } catch (error) {
      throw new Error(`Sign in failed: ${error}`);
    }
  }

  // Sign up with email and password
  static async signUpWithEmail(
    email: string,
    password: string,
    displayName: string
  ): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Update Firebase Auth profile
      await updateProfile(userCredential.user, { displayName });

      // Create user document in Firestore
      const userData: Omit<User, 'uid'> = {
        displayName,
        photoURL: userCredential.user.photoURL || undefined,
        plan: 'free' as UserPlan,
        groupsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'users', userCredential.user.uid), userData);

      return {
        uid: userCredential.user.uid,
        ...userData
      };
    } catch (error) {
      throw new Error(`Sign up failed: ${error}`);
    }
  }

  // Sign in with Google
  static async signInWithGoogle(): Promise<User> {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // Check if user document exists, create if not
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));

      if (!userDoc.exists()) {
        const userData: Omit<User, 'uid'> = {
          displayName: result.user.displayName || 'Anonymous',
          photoURL: result.user.photoURL || undefined,
          plan: 'free' as UserPlan,
          groupsCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await setDoc(doc(db, 'users', result.user.uid), userData);
      }

      return await this.getUserData(result.user.uid);
    } catch (error) {
      throw new Error(`Google sign in failed: ${error}`);
    }
  }

  // Sign in with Apple (iOS only)
  static async signInWithApple(): Promise<User> {
    try {
      const provider = new OAuthProvider('apple.com');
      const result = await signInWithPopup(auth, provider);

      // Check if user document exists, create if not
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));

      if (!userDoc.exists()) {
        const userData: Omit<User, 'uid'> = {
          displayName: result.user.displayName || 'Anonymous',
          photoURL: result.user.photoURL || undefined,
          plan: 'free' as UserPlan,
          groupsCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        await setDoc(doc(db, 'users', result.user.uid), userData);
      }

      return await this.getUserData(result.user.uid);
    } catch (error) {
      throw new Error(`Apple sign in failed: ${error}`);
    }
  }

  // Sign out
  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      throw new Error(`Sign out failed: ${error}`);
    }
  }

  // Get user data from Firestore
  static async getUserData(uid: string): Promise<User> {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));

      if (!userDoc.exists()) {
        throw new Error('User document not found');
      }

      const userData = userDoc.data();
      return {
        uid,
        ...userData,
        createdAt: userData.createdAt?.toDate() || new Date(),
        updatedAt: userData.updatedAt?.toDate() || new Date()
      } as User;
    } catch (error) {
      throw new Error(`Failed to get user data: ${error}`);
    }
  }

  // Listen to auth state changes
  static onAuthStateChanged(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          const user = await this.getUserData(firebaseUser.uid);
          callback(user);
        } catch (error) {
          console.error('Error getting user data:', error);
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  }

  // Get current user
  static getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }
}
