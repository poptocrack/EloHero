import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

interface ToastProps {
  readonly visible: boolean;
  readonly type: 'success' | 'error';
  readonly message: string;
  readonly onHide: () => void;
  readonly duration?: number;
}

export default function Toast({
  visible,
  type,
  message,
  onHide,
  duration = 3000
}: Readonly<ToastProps>) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const hideToast = (): void => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 100,
        duration: 250,
        useNativeDriver: true
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true
      })
    ]).start(() => {
      onHide();
    });
  };

  useEffect(() => {
    if (visible) {
      // Reset animation values
      slideAnim.setValue(100);
      opacityAnim.setValue(0);

      // Slide in animation from bottom
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, slideAnim, opacityAnim, duration]);

  if (!visible) {
    return null;
  }

  const isSuccess = type === 'success';
  const iconName = isSuccess ? 'checkmark-circle' : 'alert-circle';
  const iconColor = '#fff';
  const gradientColors: [string, string] = isSuccess
    ? ['#4ECDC4', '#44A08D'] // Teal gradient for success
    : ['#FF6B9D', '#C44569']; // Pink gradient for error

  return (
    <Animated.View
      style={[
        styles.container,
        {
          bottom: insets.bottom + 100,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim
        }
      ]}
      pointerEvents="box-none"
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.toast}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name={iconName} size={24} color={iconColor} />
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {message}
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'center'
  },
  toast: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
    width: '100%'
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  },
  iconContainer: {
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0
  },
  message: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center'
  }
});
