// Player Profile Screen
import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { FirestoreService } from '../../services/firestore';
import { RatingChange, Rating } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useGroupStore } from '../../store/groupStore';
import {
  ScreenHeader,
  LoadingState,
  ErrorState,
  PlayerHeader,
  PlayerStats,
  WinRateCard,
  RemoveMemberButton,
  RatingHistoryTable
} from './components';

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
      console.log('Loading player data for uid:', uid, 'groupId:', groupId);

      // For now, we'll load the first season's data
      // In a real app, you'd want to get the current season
      const seasons = await FirestoreService.getGroupSeasons(groupId);
      console.log('Found seasons:', seasons.length);

      const currentSeason = seasons.find((s) => s.isActive) || seasons[0];
      console.log('Using season:', currentSeason?.id, 'isActive:', currentSeason?.isActive);

      if (currentSeason) {
        const ratings = await FirestoreService.getSeasonRatings(currentSeason.id);
        console.log('Found ratings:', ratings.length);

        const playerRatingData = ratings.find((r) => r.uid === uid);
        console.log('Player rating data:', playerRatingData);
        setPlayerRating(playerRatingData || null);

        const history = await FirestoreService.getUserRatingHistory(uid, currentSeason.id);
        console.log('Found rating history:', history.length, 'items');
        console.log('Rating history data:', history);
        setRatingHistory(history);
      } else {
        console.log('No season found for group');
      }
    } catch (error) {
      console.error('Error loading player data:', error);
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
              console.error('Error removing member:', error);
              Alert.alert(t('common.error'), t('playerProfile.removeError'));
            } finally {
              setIsRemoving(false);
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#F8F9FF' }]}>
        <ScreenHeader
          title={t('playerProfile.title')}
          onBackPress={() => navigation.goBack()}
        />
        <LoadingState />
      </View>
    );
  }

  if (!playerRating) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#F8F9FF' }]}>
        <ScreenHeader
          title={t('playerProfile.title')}
          onBackPress={() => navigation.goBack()}
        />
        <ErrorState />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#F8F9FF' }]}>
      <ScreenHeader
        title={t('playerProfile.title')}
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#667eea']}
          />
        }
      >
        <PlayerHeader
          displayName={displayName || ''}
          uid={uid}
          rating={playerRating}
        />

        {isAdmin && (
          <RemoveMemberButton
            onPress={handleRemoveMember}
            isRemoving={isRemoving}
          />
        )}

        <PlayerStats rating={playerRating} />

        <WinRateCard rating={playerRating} />

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
