import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as StoreReview from 'expo-store-review';
import { markUserAsReviewed, markUserDeclinedReview } from '../utils/reviewUtils';

interface ReviewModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ReviewModal({ visible, onClose }: ReviewModalProps) {
  const { t } = useTranslation();

  const handleReview = async (): Promise<void> => {
    try {
      // Check if StoreReview is available
      const isAvailable = await StoreReview.isAvailableAsync();
      
      if (isAvailable) {
        // Request review
        await StoreReview.requestReview();
        // Mark as reviewed (even if they don't complete it, we don't want to ask again)
        await markUserAsReviewed();
      }
    } catch (error) {
      console.error('Error requesting review:', error);
    } finally {
      onClose();
    }
  };

  const handleDecline = async (): Promise<void> => {
    await markUserDeclinedReview();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalIcon}>
            <Ionicons name="star" size={32} color="#FF6B9D" />
          </View>
          <Text style={styles.modalTitle}>{t('review.title')}</Text>
          <Text style={styles.modalSubtitle}>{t('review.subtitle')}</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleReview}>
              <Text style={styles.primaryButtonText}>{t('review.reviewButton')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleDecline}>
              <Text style={styles.secondaryButtonText}>{t('review.maybeLater')}</Text>
            </TouchableOpacity>
          </View>
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
    marginBottom: 24
  },
  buttonContainer: {
    gap: 12
  },
  primaryButton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
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

