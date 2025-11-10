// Firestore Service - Read operations only
// All writes go through Cloud Functions as per cursor rules
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Group, Member, Season, Rating, Game, Participant, RatingChange, User } from '@elohero/shared-types';

export class FirestoreService {
  // Get user's groups
  static async getUserGroups(uid: string): Promise<Group[]> {
    try {
      // Query all memberships for this user
      const membershipsQuery = query(
        collection(db, 'members'),
        where('uid', '==', uid),
        where('isActive', '==', true)
      );
      const membershipsSnapshot = await getDocs(membershipsQuery);

      if (membershipsSnapshot.empty) {
        return [];
      }

      const groups: Group[] = [];
      for (const membershipDoc of membershipsSnapshot.docs) {
        const memberData = membershipDoc.data();
        const groupId = memberData.groupId;
        if (!groupId) continue;

        const groupDoc = await getDoc(doc(db, 'groups', groupId));
        if (!groupDoc.exists()) continue;
        const groupData = groupDoc.data();
        if (!groupData.isActive) continue;

        groups.push({
          id: groupDoc.id,
          ...groupData,
          createdAt: groupData.createdAt?.toDate() || new Date(),
          updatedAt: groupData.updatedAt?.toDate() || new Date()
        } as Group);
      }

      return groups;
    } catch (error) {
      throw new Error(`Failed to get user groups: ${error}`);
    }
  }

  // Listen to user's groups in real-time
  static listenToUserGroups(uid: string, callback: (groups: Group[]) => void): Unsubscribe {
    // Listen to all memberships for this user
    const membershipsQuery = query(
      collection(db, 'members'),
      where('uid', '==', uid),
      where('isActive', '==', true)
    );
    return onSnapshot(membershipsQuery, async (snapshot) => {
      const groupPromises = snapshot.docs.map(async (membershipDoc) => {
        const memberData = membershipDoc.data();
        const groupId = memberData.groupId;
        if (!groupId) return null;
        const groupDoc = await getDoc(doc(db, 'groups', groupId));
        if (!groupDoc.exists()) return null;
        const groupData = groupDoc.data();
        if (!groupData.isActive) return null;
        return {
          id: groupDoc.id,
          ...groupData,
          createdAt: groupData.createdAt?.toDate() || new Date(),
          updatedAt: groupData.updatedAt?.toDate() || new Date()
        } as Group;
      });

      const groups = (await Promise.all(groupPromises)).filter(Boolean) as Group[];
      callback(groups);
    });
  }

  // Get group details
  static async getGroup(groupId: string): Promise<Group | null> {
    try {
      const groupDoc = await getDoc(doc(db, 'groups', groupId));

      if (!groupDoc.exists()) {
        return null;
      }

      return {
        id: groupDoc.id,
        ...groupDoc.data(),
        createdAt: groupDoc.data()?.createdAt?.toDate() || new Date(),
        updatedAt: groupDoc.data()?.updatedAt?.toDate() || new Date()
      } as Group;
    } catch (error) {
      throw new Error(`Failed to get group: ${error}`);
    }
  }

  // Get group members
  static async getGroupMembers(groupId: string): Promise<Member[]> {
    try {
      // First try with orderBy, if it fails due to missing index, try without
      let membersQuery;
      try {
        membersQuery = query(
          collection(db, 'members'),
          where('groupId', '==', groupId),
          where('isActive', '==', true),
          orderBy('joinedAt', 'asc')
        );
      } catch (indexError) {
        membersQuery = query(
          collection(db, 'members'),
          where('groupId', '==', groupId),
          where('isActive', '==', true)
        );
      }

      const membersSnapshot = await getDocs(membersQuery);
      const members = membersSnapshot.docs.map((doc) => ({
        uid: doc.data().uid,
        groupId: doc.data().groupId,
        displayName: doc.data().displayName,
        photoURL: doc.data().photoURL,
        joinedAt: doc.data().joinedAt?.toDate() || new Date(),
        isActive: doc.data().isActive
      })) as Member[];

      // Sort manually if we couldn't use orderBy
      return members.sort((a, b) => a.joinedAt.getTime() - b.joinedAt.getTime());
    } catch (error) {
      return [];
    }
  }

  // Listen to group members in real-time
  static listenToGroupMembers(groupId: string, callback: (members: Member[]) => void): Unsubscribe {
    const membersQuery = query(
      collection(db, 'members'),
      where('groupId', '==', groupId),
      where('isActive', '==', true),
      orderBy('joinedAt', 'asc')
    );

    return onSnapshot(membersQuery, (snapshot) => {
      const members = snapshot.docs.map((doc) => ({
        uid: doc.data().uid,
        groupId: doc.data().groupId,
        displayName: doc.data().displayName,
        photoURL: doc.data().photoURL,
        joinedAt: doc.data().joinedAt?.toDate() || new Date(),
        isActive: doc.data().isActive
      })) as Member[];

      callback(members);
    });
  }

  // Get group seasons
  static async getGroupSeasons(groupId: string): Promise<Season[]> {
    try {
      // First try with orderBy, if it fails due to missing index, try without
      let seasonsQuery;
      try {
        seasonsQuery = query(
          collection(db, 'seasons'),
          where('groupId', '==', groupId),
          orderBy('createdAt', 'desc')
        );
      } catch (indexError) {
        seasonsQuery = query(collection(db, 'seasons'), where('groupId', '==', groupId));
      }

      const seasonsSnapshot = await getDocs(seasonsQuery);
      const seasons = seasonsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate?.toDate() || new Date(),
        endDate: doc.data().endDate?.toDate() || undefined,
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Season[];

      // Sort manually if we couldn't use orderBy
      return seasons.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      // Return empty array instead of throwing error - groups can exist without seasons
      return [];
    }
  }

  // Get current season ratings
  static async getSeasonRatings(seasonId: string): Promise<Rating[]> {
    try {
      // First try with orderBy, if it fails due to missing index, try without
      let ratingsQuery;
      try {
        ratingsQuery = query(
          collection(db, 'ratings'),
          where('seasonId', '==', seasonId),
          orderBy('currentRating', 'desc')
        );
      } catch (indexError) {
        ratingsQuery = query(collection(db, 'ratings'), where('seasonId', '==', seasonId));
      }

      const ratingsSnapshot = await getDocs(ratingsQuery);
      const ratings = ratingsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        lastUpdated: doc.data().lastUpdated?.toDate() || new Date()
      })) as Rating[];

      // Sort manually if we couldn't use orderBy
      return ratings.sort((a, b) => b.currentRating - a.currentRating);
    } catch (error) {
      return [];
    }
  }

  // Listen to season ratings in real-time
  static listenToSeasonRatings(
    seasonId: string,
    callback: (ratings: Rating[]) => void
  ): Unsubscribe {
    const ratingsQuery = query(
      collection(db, 'ratings'),
      where('seasonId', '==', seasonId),
      orderBy('currentRating', 'desc')
    );

    return onSnapshot(ratingsQuery, (snapshot) => {
      const ratings = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        lastUpdated: doc.data().lastUpdated?.toDate() || new Date()
      })) as Rating[];

      callback(ratings);
    });
  }

  // Get group games
  static async getGroupGames(groupId: string, limitCount: number = 50): Promise<Game[]> {
    try {
      // First try with orderBy, if it fails due to missing index, try without
      let gamesQuery;
      try {
        gamesQuery = query(
          collection(db, 'games'),
          where('groupId', '==', groupId),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      } catch (indexError) {
        gamesQuery = query(
          collection(db, 'games'),
          where('groupId', '==', groupId),
          limit(limitCount)
        );
      }

      const gamesSnapshot = await getDocs(gamesQuery);
      const games = gamesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Game[];

      // Sort manually if we couldn't use orderBy
      return games.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      return [];
    }
  }

  // Get single game by ID
  static async getGameById(gameId: string): Promise<Game | null> {
    try {
      const gameDoc = await getDoc(doc(db, 'games', gameId));
      if (!gameDoc.exists()) {
        return null;
      }
      const gameData = gameDoc.data();
      return {
        id: gameDoc.id,
        ...gameData,
        createdAt: gameData.createdAt?.toDate() || new Date()
      } as Game;
    } catch (error) {
      return null;
    }
  }

  // Get game participants
  static async getGameParticipants(gameId: string): Promise<Participant[]> {
    try {
      // First try with orderBy, if it fails due to missing index, try without
      let participantsQuery;
      try {
        participantsQuery = query(
          collection(db, 'participants'),
          where('gameId', '==', gameId),
          orderBy('placement', 'asc')
        );
      } catch (indexError) {
        participantsQuery = query(collection(db, 'participants'), where('gameId', '==', gameId));
      }

      const participantsSnapshot = await getDocs(participantsQuery);
      const participants = participantsSnapshot.docs.map((doc) => ({
        uid: doc.data().uid,
        gameId: doc.data().gameId,
        displayName: doc.data().displayName,
        photoURL: doc.data().photoURL,
        placement: doc.data().placement,
        isTied: doc.data().isTied,
        ratingBefore: doc.data().ratingBefore,
        ratingAfter: doc.data().ratingAfter,
        ratingChange: doc.data().ratingChange
      })) as Participant[];

      // Sort manually if we couldn't use orderBy
      return participants.sort((a, b) => a.placement - b.placement);
    } catch (error) {
      return [];
    }
  }

  // Get user's rating history for a specific season
  static async getUserRatingHistory(
    uid: string,
    seasonId: string,
    limitCount: number = 50
  ): Promise<RatingChange[]> {
    try {
      // First try with orderBy, if it fails due to missing index, try without
      let ratingChangesQuery;
      try {
        ratingChangesQuery = query(
          collection(db, 'ratingChanges'),
          where('uid', '==', uid),
          where('seasonId', '==', seasonId),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      } catch (indexError) {
        ratingChangesQuery = query(
          collection(db, 'ratingChanges'),
          where('uid', '==', uid),
          where('seasonId', '==', seasonId),
          limit(limitCount)
        );
      }

      const ratingChangesSnapshot = await getDocs(ratingChangesQuery);

      const ratingChanges = ratingChangesSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date()
        };
      }) as RatingChange[];

      // Sort manually if we couldn't use orderBy
      return ratingChanges.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      return [];
    }
  }

  // Get user's rating history for a group (across all seasons)
  static async getUserRatingHistoryByGroup(
    uid: string,
    groupId: string,
    limitCount: number = 50
  ): Promise<RatingChange[]> {
    try {
      // Query by groupId and uid to get all rating changes across all seasons
      let ratingChangesQuery;
      try {
        ratingChangesQuery = query(
          collection(db, 'ratingChanges'),
          where('uid', '==', uid),
          where('groupId', '==', groupId),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
        const ratingChangesSnapshot = await getDocs(ratingChangesQuery);

        const ratingChanges = ratingChangesSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date()
          };
        }) as RatingChange[];

        return ratingChanges.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      } catch (indexError) {
        ratingChangesQuery = query(
          collection(db, 'ratingChanges'),
          where('uid', '==', uid),
          where('groupId', '==', groupId),
          limit(limitCount)
        );
        const ratingChangesSnapshot = await getDocs(ratingChangesQuery);

        const ratingChanges = ratingChangesSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date()
          };
        }) as RatingChange[];

        // Sort manually if we couldn't use orderBy
        return ratingChanges.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
    } catch (error) {
      return [];
    }
  }

  // Check if invite code is valid
  static async validateInviteCode(
    code: string
  ): Promise<{ isValid: boolean; groupId?: string; groupName?: string }> {
    try {
      const inviteDoc = await getDoc(doc(db, 'invites', code));

      if (!inviteDoc.exists()) {
        return { isValid: false };
      }

      const inviteData = inviteDoc.data();

      // Check if invite is still active and not expired
      if (!inviteData.isActive || inviteData.expiresAt.toDate() < new Date()) {
        return { isValid: false };
      }

      // Check if max uses reached
      if (inviteData.maxUses && inviteData.currentUses >= inviteData.maxUses) {
        return { isValid: false };
      }

      // Get group name
      const groupDoc = await getDoc(doc(db, 'groups', inviteData.groupId));
      const groupName = groupDoc.exists() ? groupDoc.data().name : 'Unknown Group';

      return {
        isValid: true,
        groupId: inviteData.groupId,
        groupName
      };
    } catch (error) {
      throw new Error(`Failed to validate invite code: ${error}`);
    }
  }
}
