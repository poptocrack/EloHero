import { registerRootComponent } from 'expo';
import * as Sentry from '@sentry/react-native';

// Initialize Sentry as early as possible, before importing App
// This ensures errors are caught even during module loading
// Note: This must be synchronous and not throw, otherwise app registration will fail
Sentry.init({
  dsn: 'https://57406c83b7e43e0b254568ff7d7f8120@o4510359779016704.ingest.de.sentry.io/4510359780720720',
  sendDefaultPii: true,
  enableLogs: true,
  environment: __DEV__ ? 'development' : 'production'
});

// Import App after Sentry is initialized
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
