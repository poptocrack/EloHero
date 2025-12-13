import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import AppNavigator from './src/navigation/AppNavigator';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Sentry from '@sentry/react-native';
import * as SplashScreen from 'expo-splash-screen';
// Import i18n - initialization happens in the module
import './src/i18n';
import { queryClient } from './src/utils/queryClient';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

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
export default Sentry.wrap(App);
