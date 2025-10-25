import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface MatchSubmitButtonProps {
  onPress: () => void;
  isDisabled: boolean;
  isLoading: boolean;
}

export default function MatchSubmitButton({
  onPress,
  isDisabled,
  isLoading
}: MatchSubmitButtonProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.submitContainer}>
      <TouchableOpacity
        style={[styles.submitButton, isDisabled && styles.disabledButton]}
        onPress={onPress}
        disabled={isDisabled}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="checkmark" size={20} color="#fff" />
            <Text style={styles.submitButtonText}>{t('matchEntry.saveMatch')}</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  submitContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#F8F9FF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)'
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  disabledButton: {
    backgroundColor: '#E2E8F0'
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8
  }
});
