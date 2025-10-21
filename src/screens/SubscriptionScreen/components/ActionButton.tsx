import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

interface ActionButtonProps {
  isPremium: boolean;
  onUpgrade: () => void;
  onManageSubscription: () => void;
}

export default function ActionButton({
  isPremium,
  onUpgrade,
  onManageSubscription
}: ActionButtonProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.actionContainer}>
      {isPremium ? (
        <TouchableOpacity style={styles.manageButton} onPress={onManageSubscription}>
          <LinearGradient
            colors={['#4ECDC4', '#44A08D']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="settings" size={20} color="#fff" />
            <Text style={styles.buttonText}>{t('subscription.manageSubscription')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.upgradeButton} onPress={onUpgrade}>
          <LinearGradient
            colors={['#FF6B9D', '#C44569']}
            style={styles.buttonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="diamond" size={20} color="#fff" />
            <Text style={styles.buttonText}>{t('subscription.upgrade')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actionContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  upgradeButton: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8
  },
  manageButton: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8
  }
});
