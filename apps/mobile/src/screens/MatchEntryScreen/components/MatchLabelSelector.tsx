import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { MatchLabel } from '@elohero/shared-types';

interface MatchLabelSelectorProps {
  selectedLabel: MatchLabel | null;
  onPress: () => void;
  isPremiumUser: boolean;
  onPremiumPress: () => void;
}

export default function MatchLabelSelector({
  selectedLabel,
  onPress,
  isPremiumUser,
  onPremiumPress
}: MatchLabelSelectorProps) {
  const { t } = useTranslation();

  const handlePress = () => {
    if (isPremiumUser) {
      onPress();
    } else {
      onPremiumPress();
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.7}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="pricetag-outline" size={20} color="#667eea" />
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.labelText}>{t('matchEntry.matchLabel.title')}</Text>
            <Text
              style={[styles.valueText, !selectedLabel && styles.valueTextPlaceholder]}
              numberOfLines={1}
            >
              {selectedLabel
                ? selectedLabel.name
                : t('matchEntry.matchLabel.noLabelSelected')}
            </Text>
            {!isPremiumUser && (
              <View style={styles.premiumBadge}>
                <Ionicons name="lock-closed-outline" size={12} color="#FF6B9D" />
                <Text style={styles.premiumText}>{t('matchEntry.matchLabel.premiumFeature')}</Text>
              </View>
            )}
          </View>
          <Ionicons name="chevron-forward-outline" size={20} color="#718096" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginBottom: 16
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  textContainer: {
    flex: 1,
    gap: 4
  },
  labelText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  valueText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748'
  },
  valueTextPlaceholder: {
    color: '#A0AEC0'
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2
  },
  premiumText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FF6B9D'
  }
});

