import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
// Import i18n - initialization happens in the module
import './src/i18n';

import * as Sentry from '@sentry/react-native';
import * as Updates from 'expo-updates';

// Ensure we're using local code in development, not cached production updates
if (__DEV__) {
  // In development mode, Expo Updates should be disabled automatically
  // But we explicitly check and log to ensure we're using local code
  if (Updates.isEnabled) {
    console.warn(
      '⚠️ Expo Updates is enabled in development mode. This should not happen when using expo start.'
    );
    console.warn(
      'If you see this warning, you may be running a production build. Use "expo start" for development.'
    );
  } else {
    console.log('✅ Development mode: Using local JavaScript code (Expo Updates disabled)');
  }
} else if (Updates.isEnabled) {
  // In production, log update information for debugging
  console.log('📦 Production mode: Expo Updates enabled');
  console.log('Update ID:', Updates.updateId || 'N/A');
  console.log('Manifest ID:', Updates.manifest?.id || 'N/A');
}

// Initialize Sentry as early as possible, before importing App
// This ensures errors are caught even during module loading
// Note: This must be synchronous and not throw, otherwise app registration will fail
// Wrap in try-catch to ensure app registration isn't blocked if Sentry fails to initialize
try {
  Sentry.init({
    dsn: 'https://57406c83b7e43e0b254568ff7d7f8120@o4510359779016704.ingest.de.sentry.io/4510359780720720',
    sendDefaultPii: true,
    enableLogs: true,
    environment: __DEV__ ? 'development' : 'production'
  });
} catch (error) {
  // Log error but don't block app registration
  console.error('Failed to initialize Sentry:', error);
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  }
});

function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </LanguageProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

export default App;
