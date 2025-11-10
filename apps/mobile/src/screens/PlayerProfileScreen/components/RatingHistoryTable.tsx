import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { RatingChange } from '@elohero/shared-types';

interface RatingHistoryTableProps {
  ratingHistory: RatingChange[];
}

export default function RatingHistoryTable({ ratingHistory }: RatingHistoryTableProps) {
  const { t } = useTranslation();

  const formatDate = (date: Date): string => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return t('common.today') || 'Today';
    }
    if (isYesterday) {
      return t('common.yesterday') || 'Yesterday';
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false
    });
  };

  const renderHistoryItem = (item: RatingChange, index: number) => {
    const isPositive = item.ratingChange > 0;
    const isNegative = item.ratingChange < 0;

    const changeColor = isPositive ? '#4ECDC4' : isNegative ? '#FF6B9D' : '#718096';
    const changeBgColor = isPositive
      ? 'rgba(78, 205, 196, 0.1)'
      : isNegative
      ? 'rgba(255, 107, 157, 0.1)'
      : 'rgba(113, 128, 150, 0.1)';

    const iconName = isPositive ? 'arrow-up' : isNegative ? 'arrow-down' : 'remove';

    return (
      <View key={item.id} style={styles.historyItem}>
        <View style={styles.historyItemContent}>
          {/* Timeline indicator */}
          <View style={styles.timelineContainer}>
            <View style={[styles.timelineDot, { backgroundColor: changeColor }]} />
            {index < ratingHistory.length - 1 && <View style={styles.timelineLine} />}
          </View>

          {/* Main content */}
          <View
            style={[
              styles.historyItemMain,
              index === ratingHistory.length - 1 && styles.historyItemMainLast
            ]}
          >
            <View style={styles.historyItemHeader}>
              <View style={styles.dateContainer}>
                <Ionicons name="calendar-outline" size={16} color="#718096" />
                <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
              </View>
            </View>

            <View style={styles.historyItemBody}>
              <View style={styles.ratingInfo}>
                <View style={styles.ratingLabels}>
                  <Text style={styles.ratingLabel}>{t('playerProfile.ratingBefore')}:</Text>
                  <Text style={styles.ratingValue}>{item.ratingBefore}</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#CBD5E0" />
                <View style={styles.ratingLabels}>
                  <Text style={styles.ratingLabel}>{t('playerProfile.ratingAfter')}:</Text>
                  <Text style={styles.ratingValue}>{item.ratingAfter}</Text>
                </View>
              </View>

              <View style={[styles.changeBadge, { backgroundColor: changeBgColor }]}>
                <View style={styles.changeBadgeContent}>
                  <Ionicons name={iconName} size={18} color={changeColor} />
                  <Text style={[styles.changeText, { color: changeColor }]}>
                    {isPositive ? '+' : ''}
                    {item.ratingChange}
                  </Text>
                </View>
              </View>
            </View>

            {item.placement && (
              <View style={styles.placementContainer}>
                <Ionicons name="trophy" size={14} color="#FF6B9D" />
                <Text style={styles.placementText}>
                  {t('playerProfile.position')} {item.placement}
                  {item.isTied && ` ${t('playerProfile.tied')}`}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.historySection}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <View style={styles.sectionIconContainer}>
            <Ionicons name="time-outline" size={20} color="#667eea" />
          </View>
          <Text style={styles.historyTitle}>{t('playerProfile.ratingHistory')}</Text>
        </View>
        {ratingHistory.length > 0 && (
          <Text style={styles.historyCount}>{ratingHistory.length}</Text>
        )}
      </View>

      {ratingHistory.length === 0 ? (
        <View style={styles.card}>
          <View style={styles.cardGradient}>
            <View style={styles.emptyHistory}>
              <View style={styles.emptyHistoryIconContainer}>
                <Ionicons name="trending-up-outline" size={40} color="#718096" />
              </View>
              <Text style={styles.emptyHistoryText}>{t('playerProfile.noHistory')}</Text>
              <Text style={styles.emptyHistorySubtext}>
                {t('playerProfile.noHistorySubtext') || 'Your rating changes will appear here'}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <View style={styles.cardGradient}>
            {ratingHistory.map((item, index) => renderHistoryItem(item, index))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  historySection: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748'
  },
  historyCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#667eea',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  card: {
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
    padding: 20,
    backgroundColor: '#FFFFFF'
  },
  historyItem: {
    marginBottom: 0
  },
  historyItemContent: {
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  timelineContainer: {
    alignItems: 'center',
    marginRight: 16,
    width: 24
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
    minHeight: 40
  },
  historyItemMain: {
    flex: 1,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  historyItemMainLast: {
    borderBottomWidth: 0,
    paddingBottom: 0
  },
  historyItemHeader: {
    marginBottom: 12
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
    marginRight: 8
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#718096'
  },
  historyItemBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  ratingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  ratingLabels: {
    flexDirection: 'column',
    gap: 4
  },
  ratingLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  ratingValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D3748'
  },
  changeBadge: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 80,
    alignItems: 'center'
  },
  changeBadgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  changeText: {
    fontSize: 18,
    fontWeight: '700'
  },
  placementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4
  },
  placementText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#718096'
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 40
  },
  emptyHistoryIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(113, 128, 150, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  emptyHistoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    textAlign: 'center',
    marginBottom: 4
  },
  emptyHistorySubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: '#718096',
    textAlign: 'center'
  }
});
