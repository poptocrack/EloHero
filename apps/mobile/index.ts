import { registerRootComponent } from 'expo';
import App from './App';

import * as Sentry from '@sentry/react-native';

// Initialize Sentry as early as possible, before importing App
// This ensures errors are caught even during module loading
Sentry.init({
  dsn: 'https://57406c83b7e43e0b254568ff7d7f8120@o4510359779016704.ingest.de.sentry.io/4510359780720720',
  sendDefaultPii: true,
  debug: __DEV__,
  environment: __DEV__ ? 'development' : 'production'
});

registerRootComponent(App);
