import {
  collection,
  getDocs,
  getDoc,
  doc,
  query,
  orderBy,
  limit,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type {
  User,
  Group,
  Member,
  Season,
  Game,
  Subscription,
  Rating,
} from '@elohero/shared-types';

// Helper to convert Firestore timestamps to Date
function convertTimestamps<T extends Record<string, unknown>>(data: T): T {
  const converted = { ...data };
  for (const key in converted) {
    if (converted[key] instanceof Timestamp) {
      converted[key] = (converted[key] as Timestamp).toDate() as T[Extract<keyof T, string>];
    }
  }
  return converted;
}

export class AdminService {
  // Users
  static async getUsers(): Promise<User[]> {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return convertTimestamps({
        uid: doc.id,
        ...data,
      } as User);
    });
  }

  static async getUser(uid: string): Promise<User | null> {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return convertTimestamps({ uid: docSnap.id, ...docSnap.data() } as User);
  }

  // Groups
  static async getGroups(): Promise<Group[]> {
    const snapshot = await getDocs(query(collection(db, 'groups'), orderBy('createdAt', 'desc')));
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return convertTimestamps({
        id: doc.id,
        ...data,
      } as Group);
    });
  }

  static async getGroup(groupId: string): Promise<Group | null> {
    const docRef = doc(db, 'groups', groupId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return null;
    return convertTimestamps({ id: docSnap.id, ...docSnap.data() } as Group);
  }

  // Members
  static async getMembers(): Promise<Member[]> {
    const snapshot = await getDocs(collection(db, 'members'));
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return convertTimestamps({
        uid: doc.id.split('_')[0],
        groupId: doc.id.split('_')[1],
        ...data,
      } as Member);
    });
  }

  static async getGroupMembers(groupId: string): Promise<Member[]> {
    const q = query(collection(db, 'members'), where('groupId', '==', groupId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return convertTimestamps({
        uid: data.uid,
        groupId: data.groupId,
        ...data,
      } as Member);
    });
  }

  // Seasons
  static async getSeasons(): Promise<Season[]> {
    const snapshot = await getDocs(query(collection(db, 'seasons'), orderBy('createdAt', 'desc')));
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return convertTimestamps({
        id: doc.id,
        ...data,
      } as Season);
    });
  }

  static async getGroupSeasons(groupId: string): Promise<Season[]> {
    const q = query(
      collection(db, 'seasons'),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return convertTimestamps({
        id: doc.id,
        ...data,
      } as Season);
    });
  }

  // Games
  static async getGames(): Promise<Game[]> {
    const snapshot = await getDocs(query(collection(db, 'games'), orderBy('createdAt', 'desc')));
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return convertTimestamps({
        id: doc.id,
        ...data,
      } as Game);
    });
  }

  static async getGroupGames(groupId: string): Promise<Game[]> {
    const q = query(
      collection(db, 'games'),
      where('groupId', '==', groupId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return convertTimestamps({
        id: doc.id,
        ...data,
      } as Game);
    });
  }

  // Subscriptions
  static async getSubscriptions(): Promise<Subscription[]> {
    const snapshot = await getDocs(collection(db, 'subscriptions'));
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return convertTimestamps({
        uid: doc.id,
        ...data,
      } as Subscription);
    });
  }

  // Statistics
  static async getStats(): Promise<{
    totalUsers: number;
    totalGroups: number;
    totalGames: number;
    totalMembers: number;
    activeSubscriptions: number;
  }> {
    const [users, groups, games, members, subscriptions] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'groups')),
      getDocs(collection(db, 'games')),
      getDocs(collection(db, 'members')),
      getDocs(collection(db, 'subscriptions')),
    ]);

    const activeSubscriptions = subscriptions.docs.filter(
      (doc) => doc.data().status === 'active'
    ).length;

    return {
      totalUsers: users.size,
      totalGroups: groups.size,
      totalGames: games.size,
      totalMembers: members.size,
      activeSubscriptions,
    };
  }
}

