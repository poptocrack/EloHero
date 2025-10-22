import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { Group } from '../../../types';

interface GroupItemProps {
  group: Group;
  onPress: (group: Group) => void;
}

export default function GroupItem({ group, onPress }: GroupItemProps) {
  const { t } = useTranslation();

  return (
    <TouchableOpacity style={styles.groupItem} onPress={() => onPress(group)}>
      <LinearGradient
        colors={['#FFFFFF', '#F8F9FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.groupCardGradient}
      >
        <View style={styles.groupHeader}>
          <View style={styles.groupTitleContainer}>
            <View style={styles.groupIconContainer}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.groupIconGradient}
              >
                <Ionicons name="people" size={20} color="#fff" />
              </LinearGradient>
            </View>
            <Text style={styles.groupName}>{group.name}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#667eea" />
        </View>

        <View style={styles.groupStats}>
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="people" size={14} color="#4ECDC4" />
            </View>
            <Text style={styles.statText}>
              {group.memberCount} {t('groups.members')}
            </Text>
          </View>
          <View style={styles.statItem}>
            <View style={styles.statIconContainer}>
              <Ionicons name="trophy" size={14} color="#FF6B9D" />
            </View>
            <Text style={styles.statText}>
              {group.gameCount} {t('groups.games')}
            </Text>
          </View>
        </View>

        {group.description && (
          <Text style={styles.groupDescription} numberOfLines={2}>
            {group.description}
          </Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  groupItem: {
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6
  },
  groupCardGradient: {
    borderRadius: 20,
    padding: 20
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  groupTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  groupIconContainer: {
    marginRight: 12
  },
  groupIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  groupName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    flex: 1
  },
  groupStats: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  statText: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '600'
  },
  groupDescription: {
    fontSize: 14,
    color: '#718096',
    lineHeight: 20,
    fontWeight: '500'
  }
});
