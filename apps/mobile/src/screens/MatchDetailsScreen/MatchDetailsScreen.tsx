// Match Details Screen
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, ScrollView, Alert, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { FirestoreService } from '../../services/firestore';
import { CloudFunctionsService } from '../../services/cloudFunctions';
import { useAuthStore } from '../../store/authStore';
import { useGroupStore } from '../../store/groupStore';
import { queryKeys } from '../../utils/queryKeys';
import { Participant, Game, Group } from '@elohero/shared-types';
import { useMatchLabel } from '../../hooks/useMatchLabels';
import IndividualParticipantsView from './components/IndividualParticipantsView';
import TeamParticipantsView from './components/TeamParticipantsView';
import MatchDetailsHeader from './components/MatchDetailsHeader';
import MatchInfoCard from './components/MatchInfoCard';

interface MatchDetailsScreenProps {
  navigation: any;
  route: {
    params: {
      gameId: string;
      groupId: string;
    };
  };
}

export default function MatchDetailsScreen({
  navigation,
  route
}: Readonly<MatchDetailsScreenProps>) {
  const { gameId, groupId } = route.params;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { loadGroup, loadGroupGames, loadSeasonRatings } = useGroupStore();
  const [game, setGame] = useState<Game | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isTeamMatch = game?.gameType === 'teams';

  // Use React Query to fetch match label (cached)
  const { data: matchLabel } = useMatchLabel(groupId, game?.matchLabelId || null);

  useEffect(() => {
    loadMatchDetails();
  }, [gameId]);

  const loadMatchDetails = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const [gameData, participantsData, groupData] = await Promise.all([
        FirestoreService.getGameById(gameId),
        FirestoreService.getGameParticipants(gameId),
        FirestoreService.getGroup(groupId)
      ]);

      if (!gameData) {
        setError(t('errors.notFound'));
        return;
      }

      if (participantsData.length === 0) {
        setError(t('matchDetails.noParticipants'));
        return;
      }

      setGame(gameData);
      setParticipants(participantsData);
      setGroup(groupData);
      // Match label is automatically loaded via React Query hook above
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('errors.unknownError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const canDeleteMatch = (): boolean => {
    if (!user || !game || !group) return false;
    const isOwner = group.ownerId === user.uid;
    const isCreator = game.createdBy === user.uid;
    return isOwner || isCreator;
  };

  const handleDeleteConfirmation = async (): Promise<void> => {
    try {
      setIsDeleting(true);

      await CloudFunctionsService.deleteMatch(gameId);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.group(groupId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.groupGames(groupId) }),
        game?.seasonId
          ? queryClient.invalidateQueries({
              queryKey: queryKeys.seasonRatings(game.seasonId)
            })
          : Promise.resolve()
      ]);

      await Promise.all([
        loadGroup(groupId),
        loadGroupGames(groupId),
        game?.seasonId ? loadSeasonRatings(game.seasonId) : Promise.resolve()
      ]);

      navigation.goBack();
    } catch (err) {
      setIsDeleting(false);
      Alert.alert(
        t('matchDetails.deleteError'),
        err instanceof Error ? err.message : t('matchDetails.cannotDeleteMatch'),
        [{ text: t('common.ok') }]
      );
    }
  };

  const handleDeleteMatch = (): void => {
    if (!game) return;

    Alert.alert(
      t('matchDetails.confirmDelete'),
      `${t('matchDetails.confirmDeleteMessage')}\n\n${t('matchDetails.deleteWarning')}`,
      [
        {
          text: t('common.cancel'),
          style: 'cancel'
        },
        {
          text: t('matchDetails.confirmDelete'),
          style: 'destructive',
          onPress: () => {
            void handleDeleteConfirmation();
          }
        }
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <MatchDetailsHeader
          title={t('matchDetails.title')}
          canDelete={false}
          isDeleting={false}
          onBack={() => navigation.goBack()}
          onDelete={() => undefined}
        />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <MatchDetailsHeader
          title={t('matchDetails.title')}
          canDelete={false}
          isDeleting={false}
          onBack={() => navigation.goBack()}
          onDelete={() => undefined}
        />
        <View style={styles.centerContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  const canDelete = canDeleteMatch();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <MatchDetailsHeader
        title={t('matchDetails.title')}
        canDelete={canDelete}
        isDeleting={isDeleting}
        onBack={() => navigation.goBack()}
        onDelete={handleDeleteMatch}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {game && (
          <MatchInfoCard
            game={game}
            participantsCount={participants.length}
            matchLabel={matchLabel || null}
          />
        )}

        {isTeamMatch ? (
          <TeamParticipantsView participants={participants} />
        ) : (
          <IndividualParticipantsView participants={participants} />
        )}
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
    paddingHorizontal: 20,
    paddingBottom: 32
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#4A5568'
  },
  errorIcon: {
    fontSize: 48
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#4A5568',
    textAlign: 'center'
  }
});
