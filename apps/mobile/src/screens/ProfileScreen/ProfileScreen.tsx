// Profile Screen
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Linking,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from 'react-i18next';
import { DebugInfoCard } from './components/DebugInfoCard';

interface ProfileScreenProps {
  navigation: {
    navigate: (screen: string) => void;
  };
}

export function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, signOut } = useAuthStore();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const handleSubscription = () => {
    navigation.navigate('Subscription');
  };

  const handleAbout = () => {
    Alert.alert(t('profile.about'), t('profile.aboutMessage'), [{ text: t('common.done') }]);
  };

  const handleSupport = () => {
    Alert.alert(t('profile.support'), t('profile.supportMessage'), [
      { text: t('common.done'), style: 'cancel' },
      { text: t('profile.goToDiscord'), onPress: handleDiscord }
    ]);
  };

  const handleDiscord = async () => {
    const discordUrl = 'https://discord.gg/2MZeDx5CNZ';
    try {
      const supported = await Linking.canOpenURL(discordUrl);
      if (supported) {
        await Linking.openURL(discordUrl);
      } else {
        Alert.alert(t('common.error'), t('profile.cannotOpenDiscord'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('profile.cannotOpenDiscord'));
    }
  };

  const handleTermsOfUse = async () => {
    const termsUrl = 'https://sites.google.com/view/elohero/terms-of-use-eula?authuser=0';
    try {
      const supported = await Linking.canOpenURL(termsUrl);
      if (supported) {
        await Linking.openURL(termsUrl);
      } else {
        Alert.alert(t('common.error'), t('profile.cannotOpenLink'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('profile.cannotOpenLink'));
    }
  };

  const handlePrivacyPolicy = async () => {
    const privacyUrl = 'https://sites.google.com/view/elohero/privacy?authuser=0';
    try {
      const supported = await Linking.canOpenURL(privacyUrl);
      if (supported) {
        await Linking.openURL(privacyUrl);
      } else {
        Alert.alert(t('common.error'), t('profile.cannotOpenLink'));
      }
    } catch (error) {
      Alert.alert(t('common.error'), t('profile.cannotOpenLink'));
    }
  };

  const handleDisconnect = () => {
    Alert.alert(t('profile.disconnectConfirm'), t('profile.disconnectMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('auth.signOut'),
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            Alert.alert(t('common.error'), 'Failed to disconnect');
          }
        }
      }
    ]);
  };

  const menuItems = [
    // Hide subscription menu item on iOS

    {
      title:
        user?.plan === 'premium' ? t('profile.manageSubscription') : t('profile.unlockPremium'),
      subtitle: user?.plan === 'premium' ? t('profile.premiumActive') : t('profile.freePlan'),
      icon: 'diamond-outline',
      onPress: handleSubscription,
      showChevron: true
    },
    {
      title: t('profile.discord'),
      subtitle: t('profile.discordSubtitle'),
      icon: 'logo-discord',
      onPress: handleDiscord,
      showChevron: false
    },
    {
      title: t('profile.about'),
      subtitle: t('profile.aboutSubtitle'),
      icon: 'information-circle-outline',
      onPress: handleAbout,
      showChevron: false
    },
    {
      title: t('profile.support'),
      subtitle: t('profile.supportSubtitle'),
      icon: 'help-circle-outline',
      onPress: handleSupport,
      showChevron: false
    },
    {
      title: t('profile.termsOfUse'),
      subtitle: t('profile.termsOfUseSubtitle'),
      icon: 'document-text-outline',
      onPress: handleTermsOfUse,
      showChevron: false
    },
    {
      title: t('profile.privacyPolicy'),
      subtitle: t('profile.privacyPolicySubtitle'),
      icon: 'shield-checkmark-outline',
      onPress: handlePrivacyPolicy,
      showChevron: false
    },
    // Development-only disconnect button
    ...(__DEV__
      ? [
          {
            title: t('profile.disconnect'),
            subtitle: t('profile.disconnectSubtitle'),
            icon: 'log-out-outline',
            onPress: handleDisconnect,
            showChevron: false,
            isDestructive: true
          }
        ]
      : [])
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: '#F8F9FF' }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.displayName?.charAt(0).toUpperCase() || t('profile.user').charAt(0)}
              </Text>
            </View>
          </View>
          <Text style={styles.userName}>{user?.displayName || t('profile.user')}</Text>
          <Text style={styles.userEmail}>{user?.uid}</Text>

          <View style={styles.planBadge}>
            <View style={styles.planIconContainer}>
              <Ionicons
                name={user?.plan === 'premium' ? 'diamond' : 'person'}
                size={16}
                color={user?.plan === 'premium' ? '#ffd700' : '#667eea'}
              />
            </View>
            <Text style={[styles.planText, user?.plan === 'premium' && styles.premiumText]}>
              {user?.plan === 'premium' ? t('subscription.premium') : t('subscription.free')}
            </Text>
          </View>
        </View>

        {/* Stats Cards - Hide premium-related stats on iOS */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIconContainer}>
              <Ionicons name="people" size={20} color="#667eea" />
            </View>
            <Text style={styles.statNumber}>{user?.groupsCount || 0}</Text>
            <Text style={styles.statLabel}>{t('profile.groups')}</Text>
          </View>
          {Platform.OS !== 'ios' && (
            <>
              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="trending-up" size={20} color="#4ECDC4" />
                </View>
                <Text style={styles.statNumber}>{user?.plan === 'premium' ? '∞' : '2'}</Text>
                <Text style={styles.statLabel}>{t('profile.groupLimit')}</Text>
              </View>
              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="person-add" size={20} color="#FF6B9D" />
                </View>
                <Text style={styles.statNumber}>{user?.plan === 'premium' ? '∞' : '5'}</Text>
                <Text style={styles.statLabel}>{t('profile.memberLimit')}</Text>
              </View>
            </>
          )}
        </View>

        {/* Menu Cards */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuCard} onPress={item.onPress}>
              <View style={styles.menuCardContent}>
                <View
                  style={[
                    styles.menuIconContainer,
                    item.icon === 'logo-discord' && styles.discordIconContainer,
                    item.isDestructive && styles.destructiveIconContainer
                  ]}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={24}
                    color={
                      item.icon === 'logo-discord'
                        ? '#5865F2'
                        : item.isDestructive
                        ? '#c62828'
                        : '#667eea'
                    }
                  />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuTitle, item.isDestructive && styles.destructiveText]}>
                    {item.title}
                  </Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                {item.showChevron && <Ionicons name="chevron-forward" size={20} color="#c7c7cc" />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Debug Information Section */}
        <DebugInfoCard user={user} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF'
  },
  header: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6
  },
  avatarContainer: {
    marginBottom: 16
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff'
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 4
  },
  userEmail: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 16
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  planIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  planText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A5568'
  },
  premiumText: {
    color: '#ffd700'
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 12
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 4
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#718096',
    textAlign: 'center'
  },
  menuContainer: {
    paddingHorizontal: 20
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6
  },
  menuCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16
  },
  discordIconContainer: {
    backgroundColor: 'rgba(88, 101, 242, 0.1)'
  },
  menuTextContainer: {
    flex: 1
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 2
  },
  menuSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#718096'
  },
  destructiveIconContainer: {
    backgroundColor: 'rgba(198, 40, 40, 0.1)'
  },
  destructiveText: {
    color: '#c62828'
  }
});
