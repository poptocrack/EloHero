import React from 'react';
import { Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

interface NewMatchButtonProps {
  readonly onPress: () => boolean;
  readonly isLoading: boolean;
}

export default function NewMatchButton({ onPress, isLoading }: Readonly<NewMatchButtonProps>) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <TouchableOpacity
      style={[styles.fab, { bottom: insets.bottom + 24 }, isLoading && styles.fabDisabled]}
      onPress={onPress}
      disabled={isLoading}
      accessibilityRole="button"
      accessibilityLabel={t('groupDetails.newMatch')}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.fabText}>{t('groupDetails.newMatch')}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    backgroundColor: '#FF6B9D',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8
  },
  fabDisabled: {
    opacity: 0.6
  },
  fabText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  }
});
