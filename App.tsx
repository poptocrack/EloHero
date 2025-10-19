import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  }
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppNavigator />
      <StatusBar style="auto" />
    </QueryClientProvider>
  );
}
