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
import { Group, Member, Season, Rating, Game, Participant, RatingChange, User } from '../types';

export class FirestoreService {
  // Get user's groups
  static async getUserGroups(uid: string): Promise<Group[]> {
    try {
      // Get the user's member document directly by ID (as per security rules)
      const memberDoc = await getDoc(doc(db, 'members', uid));

      if (!memberDoc.exists()) {
        return []; // User is not a member of any group
      }

      const memberData = memberDoc.data();

      // Check if the member is active
      if (!memberData.isActive) {
        return [];
      }

      const groupId = memberData.groupId;
      if (!groupId) {
        return [];
      }

      // Get the group document
      const groupDoc = await getDoc(doc(db, 'groups', groupId));

      if (!groupDoc.exists()) {
        return []; // Group doesn't exist
      }

      const groupData = groupDoc.data();

      // Check if the group is active
      if (!groupData.isActive) {
        return [];
      }

      return [
        {
          id: groupDoc.id,
          ...groupData,
          createdAt: groupData.createdAt?.toDate() || new Date(),
          updatedAt: groupData.updatedAt?.toDate() || new Date()
        }
      ] as Group[];
    } catch (error) {
      throw new Error(`Failed to get user groups: ${error}`);
    }
  }

  // Listen to user's groups in real-time
  static listenToUserGroups(uid: string, callback: (groups: Group[]) => void): Unsubscribe {
    // Listen to the user's member document directly by ID
    return onSnapshot(doc(db, 'members', uid), async (memberSnapshot) => {
      if (!memberSnapshot.exists()) {
        callback([]); // User is not a member of any group
        return;
      }

      const memberData = memberSnapshot.data();

      // Check if the member is active
      if (!memberData.isActive) {
        callback([]);
        return;
      }

      const groupId = memberData.groupId;
      if (!groupId) {
        callback([]);
        return;
      }

      // Get the group document
      const groupDoc = await getDoc(doc(db, 'groups', groupId));

      if (!groupDoc.exists()) {
        callback([]); // Group doesn't exist
        return;
      }

      const groupData = groupDoc.data();

      // Check if the group is active
      if (!groupData.isActive) {
        callback([]);
        return;
      }

      const groups = [
        {
          id: groupDoc.id,
          ...groupData,
          createdAt: groupData.createdAt?.toDate() || new Date(),
          updatedAt: groupData.updatedAt?.toDate() || new Date()
        }
      ] as Group[];

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
      const membersQuery = query(
        collection(db, 'members'),
        where('groupId', '==', groupId),
        where('isActive', '==', true),
        orderBy('joinedAt', 'asc')
      );

      const membersSnapshot = await getDocs(membersQuery);
      return membersSnapshot.docs.map((doc) => ({
        uid: doc.data().uid,
        groupId: doc.data().groupId,
        displayName: doc.data().displayName,
        photoURL: doc.data().photoURL,
        joinedAt: doc.data().joinedAt?.toDate() || new Date(),
        isActive: doc.data().isActive
      })) as Member[];
    } catch (error) {
      throw new Error(`Failed to get group members: ${error}`);
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
      const seasonsQuery = query(
        collection(db, 'seasons'),
        where('groupId', '==', groupId),
        orderBy('createdAt', 'desc')
      );

      const seasonsSnapshot = await getDocs(seasonsQuery);
      return seasonsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        startDate: doc.data().startDate?.toDate() || new Date(),
        endDate: doc.data().endDate?.toDate() || undefined,
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Season[];
    } catch (error) {
      throw new Error(`Failed to get group seasons: ${error}`);
    }
  }

  // Get current season ratings
  static async getSeasonRatings(seasonId: string): Promise<Rating[]> {
    try {
      const ratingsQuery = query(
        collection(db, 'ratings'),
        where('seasonId', '==', seasonId),
        orderBy('currentRating', 'desc')
      );

      const ratingsSnapshot = await getDocs(ratingsQuery);
      return ratingsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        lastUpdated: doc.data().lastUpdated?.toDate() || new Date()
      })) as Rating[];
    } catch (error) {
      throw new Error(`Failed to get season ratings: ${error}`);
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
      const gamesQuery = query(
        collection(db, 'games'),
        where('groupId', '==', groupId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const gamesSnapshot = await getDocs(gamesQuery);
      return gamesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Game[];
    } catch (error) {
      throw new Error(`Failed to get group games: ${error}`);
    }
  }

  // Get game participants
  static async getGameParticipants(gameId: string): Promise<Participant[]> {
    try {
      const participantsQuery = query(
        collection(db, 'participants'),
        where('gameId', '==', gameId),
        orderBy('placement', 'asc')
      );

      const participantsSnapshot = await getDocs(participantsQuery);
      return participantsSnapshot.docs.map((doc) => ({
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
    } catch (error) {
      throw new Error(`Failed to get game participants: ${error}`);
    }
  }

  // Get user's rating history
  static async getUserRatingHistory(
    uid: string,
    seasonId: string,
    limitCount: number = 50
  ): Promise<RatingChange[]> {
    try {
      const ratingChangesQuery = query(
        collection(db, 'ratingChanges'),
        where('uid', '==', uid),
        where('seasonId', '==', seasonId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const ratingChangesSnapshot = await getDocs(ratingChangesQuery);
      return ratingChangesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as RatingChange[];
    } catch (error) {
      throw new Error(`Failed to get user rating history: ${error}`);
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
