import { registerRootComponent } from 'expo';
import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
// This must be called synchronously at the top level to ensure registration
// happens before the native code tries to load the bundle (especially with Expo Updates)
registerRootComponent(App);
