import { auth } from './firebase';
import type { User } from 'firebase/auth';

/**
 * Check if the current user has admin claim
 */
export async function isAdmin(): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) {
    return false;
  }

  try {
    const tokenResult = await user.getIdTokenResult();
    return tokenResult.claims.admin === true;
  } catch (error) {
    console.error('Error checking admin claim:', error);
    return false;
  }
}

/**
 * Get all claims from the current user's token
 */
export async function getUserClaims(): Promise<Record<string, unknown>> {
  const user = auth.currentUser;
  if (!user) {
    return {};
  }

  try {
    const tokenResult = await user.getIdTokenResult(true); // Force refresh
    return tokenResult.claims;
  } catch (error) {
    console.error('Error getting user claims:', error);
    return {};
  }
}

/**
 * Force refresh the user's token to get updated claims
 */
export async function refreshUserToken(): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    return;
  }

  try {
    await user.getIdToken(true); // Force refresh
  } catch (error) {
    console.error('Error refreshing token:', error);
  }
}

