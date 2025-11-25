import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface PremiumModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateToSubscription: () => void;
  titleKey: string;
  subtitleKey: string;
  bullet1Key: string;
  bullet2Key: string;
  ctaKey: string;
  cancelKey: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

export default function PremiumModal({
  visible,
  onClose,
  onNavigateToSubscription,
  titleKey,
  subtitleKey,
  bullet1Key,
  bullet2Key,
  ctaKey,
  cancelKey,
  iconName = 'star-outline',
  iconColor = '#FF6B9D'
}: PremiumModalProps) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalIcon}>
            <Ionicons name={iconName} size={32} color={iconColor} />
          </View>
          <Text style={styles.modalTitle}>{t(titleKey)}</Text>
          <Text style={styles.modalSubtitle}>{t(subtitleKey)}</Text>

          <View style={styles.bulletRow}>
            <Ionicons name="checkmark-circle" size={18} color="#4ECDC4" />
            <Text style={styles.bulletText}>{t(bullet1Key)}</Text>
          </View>
          <View style={styles.bulletRow}>
            <Ionicons name="checkmark-circle" size={18} color="#4ECDC4" />
            <Text style={styles.bulletText}>{t(bullet2Key)}</Text>
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={onNavigateToSubscription}>
            <Text style={styles.primaryButtonText}>{t(ctaKey)}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
            <Text style={styles.secondaryButtonText}>{t(cancelKey)}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 107, 157, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3748',
    textAlign: 'center',
    marginBottom: 8
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 20
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#2D3748'
  },
  primaryButton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700'
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0'
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568'
  }
});
