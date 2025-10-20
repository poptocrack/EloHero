// Authentication Store using Zustand
import { create } from 'zustand';
import { AuthService } from '../services/auth';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;

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
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

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
  }
}));
