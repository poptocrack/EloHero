// Main App Navigator
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { AuthService } from '../services/auth';
import { RootStackParamList, MainTabParamList } from '../types';
import SetPseudoScreen from '../screens/SetPseudoScreen';

// Import screens
import GroupsScreen from '../screens/GroupsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import GroupDetailsScreen from '../screens/GroupDetailsScreen';
import MatchEntryScreen from '../screens/MatchEntryScreen';
import MatchDetailsScreen from '../screens/MatchDetailsScreen';
import PlayerProfileScreen from '../screens/PlayerProfileScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import SubscriptionDebugScreen from '../screens/SubscriptionDebugScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const OnboardingStack = createStackNavigator<{ SetPseudo: undefined }>();

// Main Tab Navigator
function MainTabNavigator() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Groups') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#667eea',
        tabBarInactiveTintColor: '#718096',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          height: 70 + insets.bottom,
          paddingBottom: 20 + insets.bottom,
          paddingTop: 12,
          paddingHorizontal: 20,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: -4
          },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 8
        },
        tabBarLabelStyle: {
          fontSize: 14,
          fontWeight: '600',
          marginTop: 4
        },
        headerShown: false
      })}
    >
      <Tab.Screen
        name="Groups"
        component={GroupsScreen}
        options={{ title: t('navigation.groups') }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: t('navigation.profile') }}
      />
    </Tab.Navigator>
  );
}

// Root Stack Navigator
function RootStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabNavigator} />
      <Stack.Screen name="GroupDetails" component={GroupDetailsScreen} />
      <Stack.Screen name="MatchEntry" component={MatchEntryScreen} />
      <Stack.Screen name="MatchDetails" component={MatchDetailsScreen} />
      <Stack.Screen name="PlayerProfile" component={PlayerProfileScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="SubscriptionDebug" component={SubscriptionDebugScreen} />
    </Stack.Navigator>
  );
}

// Main App Navigator
export default function AppNavigator() {
  const { user, isLoading, setUser, setLoading, signInAnonymously } = useAuthStore();

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, [setUser, setLoading]);

  // If user is not authenticated, sign in anonymously automatically
  useEffect(() => {
    if (!isLoading && !user) {
      signInAnonymously().catch(() => {});
    }
  }, [isLoading, user, signInAnonymously]);

  if (isLoading) {
    // You can add a loading screen here
    return null;
  }

  const needsPseudo = !!user && (!user.displayName || user.displayName === 'Anonymous');

  return (
    <NavigationContainer>
      {user ? (
        needsPseudo ? (
          <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
            <OnboardingStack.Screen name="SetPseudo" component={SetPseudoScreen} />
          </OnboardingStack.Navigator>
        ) : (
          <RootStackNavigator />
        )
      ) : null}
    </NavigationContainer>
  );
}
