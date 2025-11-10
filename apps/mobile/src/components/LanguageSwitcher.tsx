import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from 'react-i18next';

interface LanguageSwitcherProps {
  style?: any;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ style }) => {
  const { currentLanguage, changeLanguage } = useLanguage();
  const { t } = useTranslation();

  const languages = [
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
  ];

  const handleLanguageChange = async (languageCode: string) => {
    if (languageCode !== currentLanguage) {
      await changeLanguage(languageCode);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {languages.map((language) => (
        <TouchableOpacity
          key={language.code}
          style={[
            styles.languageButton,
            currentLanguage === language.code && styles.activeLanguageButton,
          ]}
          onPress={() => handleLanguageChange(language.code)}
        >
          <Text style={styles.flag}>{language.flag}</Text>
          <Text
            style={[
              styles.languageText,
              currentLanguage === language.code && styles.activeLanguageText,
            ]}
          >
            {language.name}
          </Text>
          {currentLanguage === language.code && (
            <Ionicons name="checkmark" size={16} color="#667eea" />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    padding: 4,
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  languageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  activeLanguageButton: {
    backgroundColor: '#667eea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  flag: {
    fontSize: 16,
  },
  languageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568',
  },
  activeLanguageText: {
    color: '#FFFFFF',
  },
});

export default LanguageSwitcher;
