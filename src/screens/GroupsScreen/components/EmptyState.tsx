import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

export default function EmptyState() {
  const { t } = useTranslation();

  return (
    <View style={styles.emptyState}>
      <Ionicons name="people-outline" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>{t('groups.noGroups')}</Text>
      <Text style={styles.emptyStateText}>{t('groups.noGroupsSubtitle')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3748',
    marginTop: 16,
    marginBottom: 8
  },
  emptyStateText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '500',
    paddingHorizontal: 20
  }
});
