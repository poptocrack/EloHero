import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

// Import translation files
import en from './locales/en.json';
import fr from './locales/fr.json';

const LANGUAGE_DETECTOR = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      const savedLanguage = await AsyncStorage.getItem('user-language');
      if (savedLanguage) {
        callback(savedLanguage);
      } else {
        // Use device language, fallback to English
        const locales = Localization.getLocales();
        const deviceLanguage = locales[0]?.languageCode || 'en'; // Get language code (e.g., 'en' from 'en-US')
        const supportedLanguages = ['en', 'fr'];
        const language = supportedLanguages.includes(deviceLanguage) ? deviceLanguage : 'en';
        callback(language);
      }
    } catch (error) {
      console.log('Error reading language from storage:', error);
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: async (lng: string) => {
    try {
      await AsyncStorage.setItem('user-language', lng);
    } catch (error) {
      console.log('Error saving language to storage:', error);
    }
  }
};

i18n
  .use(LANGUAGE_DETECTOR)
  .use(initReactI18next)
  .init({
    fallbackLng: 'fr',
    resources: {
      en: {
        translation: en
      },
      fr: {
        translation: fr
      }
    },
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
