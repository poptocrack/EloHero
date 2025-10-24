import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

interface EmptyStateProps {
  onCreateGroup: () => void;
  onJoinGroup: () => void;
}

export default function EmptyState({ onCreateGroup, onJoinGroup }: EmptyStateProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.emptyState}>
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={onCreateGroup}>
          <LinearGradient
            colors={['#FF6B9D', '#C44569']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionButtonGradient}
          >
            <View style={styles.actionButtonContent}>
              <View style={styles.actionButtonIcon}>
                <Ionicons name="add-circle" size={24} color="#fff" />
              </View>
              <Text style={styles.actionButtonTitle}>{t('groups.createGroup')}</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('common.or')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.actionButton} onPress={onJoinGroup}>
          <LinearGradient
            colors={['#4ECDC4', '#44A08D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionButtonGradient}
          >
            <View style={styles.actionButtonContent}>
              <View style={styles.actionButtonIcon}>
                <Ionicons name="people" size={24} color="#fff" />
              </View>
              <Text style={styles.actionButtonTitle}>{t('groups.joinGroup')}</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    flex: 1,
    justifyContent: 'center'
  },
  actionButtonsContainer: {
    width: '100%',
    maxWidth: 300,
    paddingHorizontal: 20
  },
  actionButton: {
    height: 60,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 16
  },
  actionButtonGradient: {
    flex: 1,
    borderRadius: 16,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionButtonIcon: {
    marginRight: 12,
    opacity: 0.9
  },
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center'
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
    marginBottom: 16
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0'
  },
  dividerText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
    marginHorizontal: 16,
    backgroundColor: '#F8F9FF',
    paddingHorizontal: 8
  }
});
