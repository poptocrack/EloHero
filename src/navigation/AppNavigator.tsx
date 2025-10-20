// Main App Navigator
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { AuthService } from '../services/auth';
import { RootStackParamList, MainTabParamList } from '../types';

// Import screens
import AuthScreen from '../screens/AuthScreen';
import GroupsScreen from '../screens/GroupsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import GroupDetailsScreen from '../screens/GroupDetailsScreen';
import MatchEntryScreen from '../screens/MatchEntryScreen';
import PlayerProfileScreen from '../screens/PlayerProfileScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// Main Tab Navigator
function MainTabNavigator() {
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
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        headerShown: false
      })}
    >
      <Tab.Screen name="Groups" component={GroupsScreen} options={{ title: 'Mes Groupes' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profil' }} />
    </Tab.Navigator>
  );
}

// Root Stack Navigator
function RootStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#007AFF'
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold'
        }
      }}
    >
      <Stack.Screen name="Main" component={MainTabNavigator} options={{ headerShown: false }} />
      <Stack.Screen
        name="GroupDetails"
        component={GroupDetailsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MatchEntry"
        component={MatchEntryScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PlayerProfile"
        component={PlayerProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// Main App Navigator
export default function AppNavigator() {
  const { user, isLoading, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = AuthService.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, [setUser, setLoading]);

  if (isLoading) {
    // You can add a loading screen here
    return null;
  }

  return (
    <NavigationContainer>
      {user ? (
        <RootStackNavigator />
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={AuthScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}
