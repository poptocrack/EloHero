import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

interface ActionCardsProps {
  onCreateGroup: () => void;
  onJoinGroup: () => void;
  groupsCount: number;
  isPremium: boolean;
  onUpgrade: () => void;
}

export default function ActionCards({
  onCreateGroup,
  onJoinGroup,
  groupsCount,
  isPremium,
  onUpgrade
}: ActionCardsProps) {
  const { t } = useTranslation();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Check if user has reached the free limit
  const isLimitReached = groupsCount >= 2 && !isPremium;
  // Hide banner on iOS
  const showBanner = isLimitReached && !bannerDismissed && Platform.OS !== 'ios';

  const handleCreateGroup = () => {
    if (isLimitReached) {
      onUpgrade();
    } else {
      onCreateGroup();
    }
  };

  const handleJoinGroup = () => {
    if (isLimitReached) {
      onUpgrade();
    } else {
      onJoinGroup();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.actionCardsContainer}>
        <TouchableOpacity
          style={[styles.actionCard, isLimitReached && styles.disabledCard]}
          onPress={handleCreateGroup}
          disabled={isLimitReached}
        >
          <LinearGradient
            colors={isLimitReached ? ['#F7FAFC', '#E2E8F0'] : ['#FF6B9D', '#C44569']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionCardGradient}
          >
            <View style={styles.actionCardContent}>
              <View style={styles.actionCardIcon}>
                <Ionicons name="add-circle" size={32} color={isLimitReached ? '#6B7280' : '#fff'} />
              </View>
              <Text style={[styles.actionCardTitle, isLimitReached && styles.disabledText]}>
                {t('groups.createGroup')}
              </Text>
              <Text style={[styles.actionCardSubtitle, isLimitReached && styles.disabledText]}>
                {isLimitReached ? t('groups.upgradeToCreate') : t('groups.createGroupSubtitle')}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, isLimitReached && styles.disabledCard]}
          onPress={handleJoinGroup}
          disabled={isLimitReached}
        >
          <LinearGradient
            colors={isLimitReached ? ['#F7FAFC', '#E2E8F0'] : ['#4ECDC4', '#44A08D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionCardGradient}
          >
            <View style={styles.actionCardContent}>
              <View style={styles.actionCardIcon}>
                <Ionicons name="people" size={32} color={isLimitReached ? '#6B7280' : '#fff'} />
              </View>
              <Text style={[styles.actionCardTitle, isLimitReached && styles.disabledText]}>
                {t('groups.joinGroup')}
              </Text>
              <Text style={[styles.actionCardSubtitle, isLimitReached && styles.disabledText]}>
                {isLimitReached ? t('groups.upgradeToJoinMore') : t('groups.joinGroupSubtitle')}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {showBanner && (
        <View style={styles.bannerContainer}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.banner}
          >
            <View style={styles.bannerContent}>
              <View style={styles.bannerIcon}>
                <Ionicons name="star" size={20} color="#fff" />
              </View>
              <View style={styles.bannerTextContainer}>
                <Text style={styles.bannerTitle}>{t('groups.upgradeBannerTitle')}</Text>
                <Text style={styles.bannerSubtitle}>{t('groups.upgradeBannerSubtitle')}</Text>
              </View>
              <TouchableOpacity
                style={styles.bannerCloseButton}
                onPress={() => setBannerDismissed(true)}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.bannerActionButton} onPress={onUpgrade}>
              <Text style={styles.bannerActionText}>{t('groups.upgradeNow')}</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 20
  },
  actionCardsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16
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
  },
  disabledCard: {
    opacity: 0.6
  },
  disabledText: {
    color: '#6B7280'
  },
  bannerContainer: {
    marginTop: 8
  },
  banner: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  bannerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  bannerTextContainer: {
    flex: 1
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2
  },
  bannerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    lineHeight: 18
  },
  bannerCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  bannerActionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center'
  },
  bannerActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  }
});
