import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface Group {
  invitationCode?: string;
}

interface InvitationCodeCardProps {
  group: Group;
  onCopyCode: () => void;
}

export default function InvitationCodeCard({ group, onCopyCode }: InvitationCodeCardProps) {
  const { t } = useTranslation();

  if (!group?.invitationCode) {
    return null;
  }

  return (
    <View style={styles.card}>
      <View style={[styles.cardGradient, { backgroundColor: '#4ECDC4' }]}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons name="link" size={20} color="#fff" />
          </View>
          <Text style={styles.cardTitle}>{t('groupDetails.invitationCode')}</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.inviteCodeDisplay}>
            <Text style={styles.inviteCodeText}>{group.invitationCode}</Text>
            <TouchableOpacity style={styles.copyButton} onPress={onCopyCode}>
              <Ionicons name="copy-outline" size={16} color="#4ECDC4" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
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
  cardContent: {
    // Content styles
  },
  inviteCodeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 12
  },
  inviteCodeText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    fontFamily: 'monospace'
  },
  copyButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)'
  }
});
