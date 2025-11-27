import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface Group {
  invitationCode?: string;
}

interface InvitationCodeCardProps {
  group: Group;
  onShareGroup: () => void;
}

export default function InvitationCodeCard({ group, onShareGroup }: InvitationCodeCardProps) {
  const { t } = useTranslation();

  if (!group?.invitationCode) {
    return null;
  }

  return (
    <TouchableOpacity style={styles.card} onPress={onShareGroup}>
      <View style={[styles.cardGradient, { backgroundColor: '#4ECDC4' }]}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="share-social" size={20} color="#fff" />
          </View>
          <Text style={styles.cardTitle}>{t('groupDetails.shareGroup')}</Text>
        </View>
        <View style={styles.shareRow}>
          <Text style={styles.cardSubtitle}>{t('groupDetails.shareGroupDescription')}</Text>
          <TouchableOpacity style={styles.shareButton} onPress={onShareGroup}>
            <Ionicons name="share-outline" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6
  },
  cardGradient: {
    borderRadius: 20,
    padding: 20
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff'
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  cardSubtitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)'
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8
  },
  cardContent: {
    // Content styles placeholder
  }
});
