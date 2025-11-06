// Cloud Functions for EloHero
// Main entry point that exports all functions

// Initialize Firebase Admin (must be done before importing other modules)
import './utils/admin';

// Export all functions
export * from './groups';
export * from './seasons';
export * from './members';
export * from './matches';
export * from './subscriptions';
export * from './users';
export * from './scheduled';
