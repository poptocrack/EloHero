// Debug Info Card Component
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { User } from '@elohero/shared-types';

interface DebugInfoCardProps {
  user: User | null;
}

export function DebugInfoCard({ user }: DebugInfoCardProps) {
  const { t } = useTranslation();
  const [updateInfo, setUpdateInfo] = useState<{
    updateId: string | null;
    createdAt: string | null;
    runtimeVersion: string | null;
  }>({
    updateId: null,
    createdAt: null,
    runtimeVersion: null
  });

  useEffect(() => {
    const loadUpdateInfo = async (): Promise<void> => {
      try {
        if (Updates.isEnabled) {
          const manifest = Updates.manifest;
          const updateId = manifest?.id || null;
          const runtimeVersion =
            manifest && 'runtimeVersion' in manifest ? manifest.runtimeVersion : null;
          const createdAt =
            manifest && 'createdAt' in manifest && manifest.createdAt
              ? new Date(manifest.createdAt).toISOString()
              : null;

          const runtimeVersionStr =
            typeof runtimeVersion === 'string'
              ? runtimeVersion
              : typeof Constants.expoConfig?.runtimeVersion === 'string'
              ? Constants.expoConfig.runtimeVersion
              : null;

          setUpdateInfo({
            updateId,
            createdAt,
            runtimeVersion: runtimeVersionStr
          });
        } else {
          // In dev mode or when updates are disabled, still show runtime version
          const runtimeVersionStr =
            typeof Constants.expoConfig?.runtimeVersion === 'string'
              ? Constants.expoConfig.runtimeVersion
              : null;
          setUpdateInfo({
            updateId: null,
            createdAt: null,
            runtimeVersion: runtimeVersionStr
          });
        }
      } catch (error) {
        // Silently fail - updates might not be available in dev mode
        const runtimeVersionStr =
          typeof Constants.expoConfig?.runtimeVersion === 'string'
            ? Constants.expoConfig.runtimeVersion
            : null;
        setUpdateInfo({
          updateId: null,
          createdAt: null,
          runtimeVersion: runtimeVersionStr
        });
      }
    };

    loadUpdateInfo();
  }, []);

  return (
    <View style={styles.debugContainer}>
      <View style={styles.debugCard}>
        <View style={styles.debugHeader}>
          <Ionicons name="information-circle" size={20} color="#718096" />
          <Text style={styles.debugTitle}>{t('profile.appInfos')}</Text>
        </View>
        <View style={styles.debugContent}>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>{t('profile.appVersion')}:</Text>
            <Text style={styles.debugValue}>{Constants.expoConfig?.version || '1.0.0'}</Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>{t('profile.buildNumber')}:</Text>
            <Text style={styles.debugValue}>
              {Platform.OS === 'ios'
                ? Constants.expoConfig?.ios?.buildNumber || 'N/A'
                : Constants.expoConfig?.android?.versionCode?.toString() || 'N/A'}
            </Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>{t('profile.platform')}:</Text>
            <Text style={styles.debugValue}>
              {Platform.OS} {Platform.Version}
            </Text>
          </View>
          {updateInfo.updateId && (
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>{t('profile.updateId')}:</Text>
              <Text style={styles.debugValue} numberOfLines={1} ellipsizeMode="middle">
                {updateInfo.updateId}
              </Text>
            </View>
          )}
          {updateInfo.runtimeVersion && (
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>{t('profile.runtimeVersion')}:</Text>
              <Text style={styles.debugValue}>{updateInfo.runtimeVersion}</Text>
            </View>
          )}
          {updateInfo.createdAt && (
            <View style={styles.debugRow}>
              <Text style={styles.debugLabel}>{t('profile.updateCreatedAt')}:</Text>
              <Text style={styles.debugValue}>
                {new Date(updateInfo.createdAt).toLocaleString()}
              </Text>
            </View>
          )}
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>{t('profile.userId')}:</Text>
            <Text style={styles.debugValue} numberOfLines={1} ellipsizeMode="middle">
              {user?.uid || 'N/A'}
            </Text>
          </View>
          <View style={styles.debugRow}>
            <Text style={styles.debugLabel}>{t('profile.environment')}:</Text>
            <Text style={styles.debugValue}>
              {__DEV__ ? t('profile.development') : t('profile.production')}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  debugContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  debugCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6
  },
  debugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748'
  },
  debugContent: {
    gap: 12
  },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap'
  },
  debugLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#718096',
    marginRight: 8,
    flexShrink: 0
  },
  debugValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D3748',
    flex: 1,
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace'
  }
});
