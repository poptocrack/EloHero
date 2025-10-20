// Profile Screen
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import GroupActionButtons from '../components/GroupActionButtons';

interface ProfileScreenProps {
  navigation: any;
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, signOut } = useAuthStore();
  const insets = useSafeAreaInsets();

  const handleCreateGroup = () => {
    navigation.navigate('Groups');
    // The create group functionality will be handled in GroupsScreen
  };

  const handleJoinGroup = () => {
    navigation.navigate('Groups');
    // The join group functionality will be handled in GroupsScreen
  };

  const handleSignOut = () => {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            Alert.alert('Erreur', 'Impossible de se déconnecter');
          }
        }
      }
    ]);
  };

  const handleSubscription = () => {
    navigation.navigate('Subscription');
  };

  const handleAbout = () => {
    Alert.alert(
      "À propos d'EloHero",
      'Version 1.0.0\n\nEloHero est une application de classement ELO communautaire qui permet aux groupes de joueurs de suivre leurs performances et de créer des classements dynamiques basés sur leurs parties.',
      [{ text: 'OK' }]
    );
  };

  const handleSupport = () => {
    Alert.alert(
      'Support',
      'Pour toute question ou problème, contactez-nous à support@elohero.app',
      [{ text: 'OK' }]
    );
  };

  const menuItems = [
    {
      title: 'Abonnement',
      subtitle: user?.plan === 'premium' ? 'Premium actif' : 'Plan gratuit',
      icon: 'diamond-outline',
      onPress: handleSubscription,
      showChevron: true
    },
    {
      title: 'À propos',
      subtitle: 'Version et informations',
      icon: 'information-circle-outline',
      onPress: handleAbout,
      showChevron: false
    },
    {
      title: 'Support',
      subtitle: 'Aide et contact',
      icon: 'help-circle-outline',
      onPress: handleSupport,
      showChevron: false
    },
    {
      title: 'Déconnexion',
      subtitle: "Se déconnecter de l'application",
      icon: 'log-out-outline',
      onPress: handleSignOut,
      showChevron: false,
      destructive: true
    }
  ];

  const renderMenuItem = (item: any, index: number) => (
    <TouchableOpacity
      key={index}
      style={[styles.menuItem, item.destructive && styles.destructiveItem]}
      onPress={item.onPress}
    >
      <View style={styles.menuItemLeft}>
        <View style={[styles.iconContainer, item.destructive && styles.destructiveIcon]}>
          <Ionicons
            name={item.icon as any}
            size={24}
            color={item.destructive ? '#ff3b30' : '#007AFF'}
          />
        </View>
        <View style={styles.menuItemText}>
          <Text style={[styles.menuItemTitle, item.destructive && styles.destructiveText]}>
            {item.title}
          </Text>
          <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
      {item.showChevron && <Ionicons name="chevron-forward" size={20} color="#c7c7cc" />}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {user?.photoURL ? (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.displayName?.charAt(0).toUpperCase()}</Text>
            </View>
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.displayName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.userName}>{user?.displayName || 'Utilisateur'}</Text>
        <Text style={styles.userEmail}>{user?.uid}</Text>

        <View style={styles.planBadge}>
          <Ionicons
            name={user?.plan === 'premium' ? 'diamond' : 'person'}
            size={16}
            color={user?.plan === 'premium' ? '#ffd700' : '#666'}
          />
          <Text style={[styles.planText, user?.plan === 'premium' && styles.premiumText]}>
            {user?.plan === 'premium' ? 'Premium' : 'Gratuit'}
          </Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{user?.groupsCount || 0}</Text>
          <Text style={styles.statLabel}>Groupes</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{user?.plan === 'premium' ? '∞' : '2'}</Text>
          <Text style={styles.statLabel}>Limite groupes</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{user?.plan === 'premium' ? '∞' : '5'}</Text>
          <Text style={styles.statLabel}>Membres max</Text>
        </View>
      </View>

      <GroupActionButtons onCreateGroup={handleCreateGroup} onJoinGroup={handleJoinGroup} />

      <View style={styles.menuContainer}>{menuItems.map(renderMenuItem)}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  avatarContainer: {
    marginBottom: 16
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff'
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  planText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginLeft: 4
  },
  premiumText: {
    color: '#ffd700'
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 20
  },
  statItem: {
    flex: 1,
    alignItems: 'center'
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 8
  },
  menuContainer: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden'
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  destructiveItem: {
    borderBottomWidth: 0
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  destructiveIcon: {
    backgroundColor: '#ffebee'
  },
  menuItemText: {
    flex: 1
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2
  },
  menuItemSubtitle: {
    fontSize: 14,
    color: '#666'
  },
  destructiveText: {
    color: '#ff3b30'
  }
});
