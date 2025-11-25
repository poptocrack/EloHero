import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface TeamModeToggleProps {
  isTeamMode: boolean;
  onToggle: () => void;
}

export default function TeamModeToggle({ isTeamMode, onToggle }: TeamModeToggleProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.toggleButton, !isTeamMode && styles.toggleButtonActive]}
        onPress={onToggle}
        disabled={!isTeamMode}
      >
        <Ionicons
          name="person-outline"
          size={20}
          color={!isTeamMode ? '#fff' : '#667eea'}
        />
        <Text style={[styles.toggleText, !isTeamMode && styles.toggleTextActive]}>
          {t('matchEntry.individualMode')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.toggleButton, isTeamMode && styles.toggleButtonActive]}
        onPress={onToggle}
        disabled={isTeamMode}
      >
        <Ionicons
          name="people-outline"
          size={20}
          color={isTeamMode ? '#fff' : '#667eea'}
        />
        <Text style={[styles.toggleText, isTeamMode && styles.toggleTextActive]}>
          {t('matchEntry.teamMode')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  toggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8
  },
  toggleButtonActive: {
    backgroundColor: '#667eea'
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea'
  },
  toggleTextActive: {
    color: '#fff'
  }
});

