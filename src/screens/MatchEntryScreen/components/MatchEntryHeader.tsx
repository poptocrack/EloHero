import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface MatchEntryHeaderProps {
  onBackPress: () => void;
}

export default function MatchEntryHeader({ onBackPress }: MatchEntryHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
        <Ionicons name="arrow-back" size={24} color="#667eea" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{t('matchEntry.title')}</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8F9FF'
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3748',
    textAlign: 'center',
    marginHorizontal: 16
  },
  headerSpacer: {
    width: 40
  }
});
