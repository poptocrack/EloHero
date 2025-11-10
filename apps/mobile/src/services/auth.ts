// Authentication Service
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User, UserPlan } from '@elohero/shared-types';

export class AuthService {
  // Sign in anonymously
  static async signInAnonymously(): Promise<User> {
    try {
      const credential = await signInAnonymously(auth);
      await this.ensureUserDocument(credential.user);
      return await this.getUserData(credential.user.uid);
    } catch (error) {
      throw new Error(`Anonymous sign in failed: ${error}`);
    }
  }

  // Sign in with email and password
  static async signInWithEmail(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Ensure user document exists
      await this.ensureUserDocument(userCredential.user);

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
      const userData: any = {
        displayName,
        plan: 'free' as UserPlan,
        groupsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Only add photoURL if it exists (Firestore doesn't allow undefined values)
      if (userCredential.user.photoURL) {
        userData.photoURL = userCredential.user.photoURL;
      }

      await setDoc(doc(db, 'users', userCredential.user.uid), userData);

      return {
        uid: userCredential.user.uid,
        displayName,
        photoURL: userCredential.user.photoURL || null,
        plan: 'free' as UserPlan,
        groupsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
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

      // Ensure user document exists
      await this.ensureUserDocument(result.user);

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

      // Ensure user document exists
      await this.ensureUserDocument(result.user);

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

  // Ensure user document exists in Firestore
  static async ensureUserDocument(firebaseUser: FirebaseUser): Promise<void> {
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

    if (!userDoc.exists()) {
      const userData: any = {
        displayName: firebaseUser.displayName || 'Anonymous',
        plan: 'free' as UserPlan,
        groupsCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Only add photoURL if it exists (Firestore doesn't allow undefined values)
      if (firebaseUser.photoURL) {
        userData.photoURL = firebaseUser.photoURL;
      }

      await setDoc(doc(db, 'users', firebaseUser.uid), userData);
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
          // Ensure user document exists before trying to get user data
          await this.ensureUserDocument(firebaseUser);
          const user = await this.getUserData(firebaseUser.uid);
          callback(user);
        } catch (error) {
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

  // Update display name in Auth and Firestore
  static async updateDisplayName(newDisplayName: string): Promise<void> {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('No authenticated user');

    // Update Firebase Auth profile
    await updateProfile(currentUser, { displayName: newDisplayName });

    // Update Firestore user document
    await updateDoc(doc(db, 'users', currentUser.uid), {
      displayName: newDisplayName,
      updatedAt: new Date()
    });
  }
}
