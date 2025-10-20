// Set Pseudo Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';

export default function SetPseudoScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { updateDisplayName, isLoading } = useAuthStore();
  const [pseudo, setPseudo] = useState('');

  const canSubmit = pseudo.trim().length >= 2;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    await updateDisplayName(pseudo.trim());
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, backgroundColor: '#F8F9FF' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.contentCard}>
        <View style={styles.iconHeader}>
          <View style={[styles.iconContainer, { backgroundColor: '#667eea' }]}>
            <Ionicons name="person" size={24} color="#fff" />
          </View>
          <Text style={styles.title}>{t('onboarding.setPseudoTitle')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.setPseudoSubtitle')}</Text>
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="at" size={20} color="#667eea" />
          <TextInput
            style={styles.input}
            placeholder={t('onboarding.pseudoPlaceholder')}
            value={pseudo}
            onChangeText={setPseudo}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={24}
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, (!canSubmit || isLoading) && styles.disabledButton]}
          disabled={!canSubmit || isLoading}
          onPress={handleSubmit}
        >
          <Text style={styles.primaryButtonText}>{t('common.confirm')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  contentCard: {
    margin: 20,
    borderRadius: 20,
    backgroundColor: '#fff',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6
  },
  iconHeader: {
    alignItems: 'flex-start',
    marginBottom: 16
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3748'
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A5568',
    marginTop: 4
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    marginTop: 16
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2D3748'
  },
  primaryButton: {
    backgroundColor: '#667eea',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  disabledButton: {
    opacity: 0.6
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  }
});
