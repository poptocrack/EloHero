import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

interface Group {
  memberCount: number;
  gameCount: number;
}

interface TabNavigationProps {
  group: Group;
  activeTab: 'ranking' | 'games';
  onTabChange: (tab: 'ranking' | 'games') => void;
}

export default function TabNavigation({
  group,
  activeTab,
  onTabChange
}: Readonly<TabNavigationProps>) {
  const { t } = useTranslation();

  return (
    <View style={styles.card}>
      <View style={[styles.cardGradient, { backgroundColor: '#fff' }]}>
        <View style={styles.tabRow}>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'ranking' && styles.activeTab]}
              onPress={() => onTabChange('ranking')}
            >
              <Text style={[styles.tabText, activeTab === 'ranking' && styles.activeTabText]}>
                {t('groupDetails.ranking')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'games' && styles.activeTab]}
              onPress={() => onTabChange('games')}
            >
              <Text style={[styles.tabText, activeTab === 'games' && styles.activeTabText]}>
                {t('groupDetails.games')}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.tabStatsRow}>
            <Text style={styles.tabStatsText} numberOfLines={1}>
              {group.memberCount} {t('groups.members')}
            </Text>
            <Text style={styles.tabStatsText} numberOfLines={1}>
              {group.gameCount} {t('groups.games')}
            </Text>
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
  tabRow: {
    flexDirection: 'column',
    gap: 12
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    padding: 4
  },
  tabStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12
  },
  activeTab: {
    backgroundColor: '#667eea',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568'
  },
  activeTabText: {
    color: '#fff'
  },
  tabStatsText: {
    marginLeft: 12,
    color: '#4A5568',
    fontSize: 14,
    fontWeight: '500'
  }
});
