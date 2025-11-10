// Authentication Store using Zustand
import { create } from 'zustand';
import { AuthService } from '../services/auth';
import { subscriptionService, PurchaseResult, SubscriptionStatus } from '../services/subscription';
import { User } from '@elohero/shared-types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  subscriptionStatus: SubscriptionStatus | null;

  // Actions
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;

  // Subscription actions
  purchasePremium: () => Promise<PurchaseResult>;
  restorePurchases: () => Promise<PurchaseResult>;
  checkSubscriptionStatus: () => Promise<void>;
  openSubscriptionManagement: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
  subscriptionStatus: null,

  signInWithEmail: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await AuthService.signInWithEmail(email, password);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Sign in failed', isLoading: false });
      throw error;
    }
  },

  signUpWithEmail: async (email: string, password: string, displayName: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await AuthService.signUpWithEmail(email, password, displayName);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Sign up failed', isLoading: false });
      throw error;
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await AuthService.signInWithGoogle();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Google sign in failed',
        isLoading: false
      });
      throw error;
    }
  },

  signInWithApple: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await AuthService.signInWithApple();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Apple sign in failed',
        isLoading: false
      });
      throw error;
    }
  },

  signInAnonymously: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await AuthService.signInAnonymously();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Anonymous sign in failed',
        isLoading: false
      });
      throw error;
    }
  },

  updateDisplayName: async (displayName: string) => {
    set({ isLoading: true, error: null });
    try {
      await AuthService.updateDisplayName(displayName);
      const current = get().user;
      if (current) {
        set({ user: { ...current, displayName }, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Update failed', isLoading: false });
      throw error;
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      await AuthService.signOut();
      set({ user: null, isAuthenticated: false, isLoading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Sign out failed', isLoading: false });
      throw error;
    }
  },

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearError: () => {
    set({ error: null });
  },

  // Subscription actions
  purchasePremium: async (): Promise<PurchaseResult> => {
    const { user } = get();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    set({ isLoading: true, error: null });
    try {
      const result = await subscriptionService.purchasePremium(user.uid);

      if (result.success) {
        // Update user plan optimistically
        set((state) => ({
          user: state.user ? { ...state.user, plan: 'premium' } : null,
          subscriptionStatus: { isActive: true, productId: 'premium1' },
          isLoading: false
        }));
      } else {
        set({ isLoading: false, error: result.error || 'Purchase failed' });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Purchase failed';
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  restorePurchases: async (): Promise<PurchaseResult> => {
    const { user } = get();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    set({ isLoading: true, error: null });
    try {
      const result = await subscriptionService.restorePurchases(user.uid);

      if (result.success) {
        // Update user plan optimistically
        set((state) => ({
          user: state.user ? { ...state.user, plan: 'premium' } : null,
          subscriptionStatus: { isActive: true, productId: 'premium1' },
          isLoading: false
        }));
      } else {
        set({ isLoading: false, error: result.error || 'Restore failed' });
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Restore failed';
      set({ error: errorMessage, isLoading: false });
      return { success: false, error: errorMessage };
    }
  },

  checkSubscriptionStatus: async (): Promise<void> => {
    const { user } = get();
    if (!user) return;

    try {
      const status = await subscriptionService.getSubscriptionStatus(user.uid);
      set({ subscriptionStatus: status });
    } catch (error) {
      // Failed to check subscription status
    }
  },

  openSubscriptionManagement: async (): Promise<void> => {
    try {
      await subscriptionService.openSubscriptionManagement();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to open subscription management';
      set({ error: errorMessage });
      throw error;
    }
  }
}));
