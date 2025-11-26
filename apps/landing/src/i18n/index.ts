import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import fr from './fr.json';

const STORAGE_KEY = 'elohero-lang';

const getInitialLanguage = (): 'en' | 'fr' => {
  if (typeof window === 'undefined') {
    return 'en';
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'fr' || stored === 'en') {
    return stored;
  }

  const isFrench = window.navigator.language?.toLowerCase().startsWith('fr');
  return isFrench ? 'fr' : 'en';
};

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

const persistLanguage = (lng: string): void => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, lng);
  document.documentElement.lang = lng;
};

if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.language;
}

i18n.on('languageChanged', (lng: string) => {
  persistLanguage(lng);
});

export { STORAGE_KEY };
export default i18n;

