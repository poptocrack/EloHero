// Player Profile Screen
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { FirestoreService } from '../../services/firestore';
import { RatingChange, Rating } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useGroupStore } from '../../store/groupStore';
import {
  LoadingState,
  ErrorState,
  PlayerHeader,
  PlayerStats,
  WinRateCard,
  RatingHistoryTable
} from './components';
import HeaderWithMenu, { MenuItem } from '../../components/HeaderWithMenu';

interface PlayerProfileScreenProps {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: Record<string, unknown>) => void;
  };
  route: {
    params: {
      uid: string;
      groupId: string;
      displayName?: string;
    };
  };
}

export default function PlayerProfileScreen({ navigation, route }: PlayerProfileScreenProps) {
  const { uid, groupId, displayName } = route.params;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { currentGroup, removeMember } = useGroupStore();
  const [playerRating, setPlayerRating] = useState<Rating | null>(null);
  const [ratingHistory, setRatingHistory] = useState<RatingChange[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    loadPlayerData();
  }, [uid, groupId]);

  const loadPlayerData = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // For now, we'll load the first season's data
      // In a real app, you'd want to get the current season
      const seasons = await FirestoreService.getGroupSeasons(groupId);

      const currentSeason = seasons.find((s) => s.isActive) || seasons[0];

      if (currentSeason) {
        const ratings = await FirestoreService.getSeasonRatings(currentSeason.id);

        const playerRatingData = ratings.find((r) => r.uid === uid);
        setPlayerRating(playerRatingData || null);

        // Get rating history by group (across all seasons) instead of just current season
        // This ensures we show all games even if they were created in different seasons
        const history = await FirestoreService.getUserRatingHistoryByGroup(uid, groupId);
        setRatingHistory(history);
      } else {
        // Still try to get rating history even if no season is found
        const history = await FirestoreService.getUserRatingHistoryByGroup(uid, groupId);
        setRatingHistory(history);
      }
    } catch (error) {
      // Error loading player data
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadPlayerData();
    setRefreshing(false);
  };

  // Check if current user is admin of the group
  const isAdmin = currentGroup?.ownerId === user?.uid;

  const handleRemoveMember = async (): Promise<void> => {
    if (!isAdmin) return;

    Alert.alert(
      t('playerProfile.confirmRemove'),
      `${t('playerProfile.confirmRemoveMessage')}\n\n${t('playerProfile.removeWarning')}`,
      [
        {
          text: t('common.cancel'),
          style: 'cancel'
        },
        {
          text: t('playerProfile.confirmRemove'),
          style: 'destructive',
          onPress: async () => {
            try {
              setIsRemoving(true);
              await removeMember(groupId, uid);
              Alert.alert(t('common.success'), t('playerProfile.removeSuccess'));
              navigation.goBack();
            } catch (error) {
              Alert.alert(t('common.error'), t('playerProfile.removeError'));
            } finally {
              setIsRemoving(false);
            }
          }
        }
      ]
    );
  };

  const menuItems: MenuItem[] | undefined = isAdmin
    ? [
        {
          icon: 'person-remove',
          text: t('playerProfile.removeFromGroup'),
          onPress: handleRemoveMember,
          isDestructive: true,
          disabled: isRemoving,
          loading: isRemoving
        }
      ]
    : undefined;

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#F8F9FF' }]}>
        <HeaderWithMenu
          title={t('playerProfile.title')}
          onBackPress={() => navigation.goBack()}
          menuItems={menuItems}
        />
        <LoadingState />
      </View>
    );
  }

  if (!playerRating) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#F8F9FF' }]}>
        <HeaderWithMenu
          title={t('playerProfile.title')}
          onBackPress={() => navigation.goBack()}
          menuItems={menuItems}
        />
        <ErrorState />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#F8F9FF' }]}>
      <HeaderWithMenu
        title={t('playerProfile.title')}
        onBackPress={() => navigation.goBack()}
        menuItems={menuItems}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#667eea']} />
        }
      >
        <PlayerHeader displayName={displayName || ''} uid={uid} rating={playerRating} />

        <WinRateCard rating={playerRating} />

        <PlayerStats rating={playerRating} />

        <RatingHistoryTable ratingHistory={ratingHistory} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF'
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    paddingBottom: 20
  }
});
