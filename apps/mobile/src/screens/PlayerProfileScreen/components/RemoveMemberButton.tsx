import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface RemoveMemberButtonProps {
  onPress: () => void;
  isRemoving: boolean;
}

export default function RemoveMemberButton({ onPress, isRemoving }: RemoveMemberButtonProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.adminActionsCard}>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={onPress}
        disabled={isRemoving}
      >
        <View style={[styles.removeButtonGradient, { backgroundColor: '#c62828' }]}>
          <View style={styles.removeButtonContent}>
            <View style={styles.removeButtonIconContainer}>
              <Ionicons name="person-remove" size={20} color="#fff" />
            </View>
            <Text style={styles.removeButtonText}>
              {isRemoving ? t('common.loading') : t('playerProfile.removeFromGroup')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  adminActionsCard: {
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  removeButton: {
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8
  },
  removeButtonGradient: {
    borderRadius: 20,
    padding: 20
  },
  removeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  removeButtonIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  removeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  }
});
