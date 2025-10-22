import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

interface ActionCardsProps {
  onCreateGroup: () => void;
  onJoinGroup: () => void;
}

export default function ActionCards({ onCreateGroup, onJoinGroup }: ActionCardsProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.actionCardsContainer}>
      <TouchableOpacity style={styles.actionCard} onPress={onCreateGroup}>
        <LinearGradient
          colors={['#FF6B9D', '#C44569']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.actionCardGradient}
        >
          <View style={styles.actionCardContent}>
            <View style={styles.actionCardIcon}>
              <Ionicons name="add-circle" size={32} color="#fff" />
            </View>
            <Text style={styles.actionCardTitle}>{t('groups.createGroup')}</Text>
            <Text style={styles.actionCardSubtitle}>{t('groups.createGroupSubtitle')}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionCard} onPress={onJoinGroup}>
        <LinearGradient
          colors={['#4ECDC4', '#44A08D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.actionCardGradient}
        >
          <View style={styles.actionCardContent}>
            <View style={styles.actionCardIcon}>
              <Ionicons name="people" size={32} color="#fff" />
            </View>
            <Text style={styles.actionCardTitle}>{t('groups.joinGroup')}</Text>
            <Text style={styles.actionCardSubtitle}>{t('groups.joinGroupSubtitle')}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  actionCardsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12
  },
  actionCard: {
    flex: 1,
    height: 120,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8
  },
  actionCardGradient: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  actionCardContent: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionCardIcon: {
    marginBottom: 8,
    opacity: 0.9
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4
  },
  actionCardSubtitle: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.8,
    fontWeight: '500'
  }
});
