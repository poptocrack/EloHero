import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useTranslation } from 'react-i18next';

export type GroupActionType = 'create' | 'join' | 'addMember';

interface GroupActionModalProps {
  isVisible: boolean;
  type: GroupActionType;
  onClose: () => void;
  onAction: (value: string) => Promise<void>;
  isLoading?: boolean;
  initialValue?: string;
}

export default function GroupActionModal({
  isVisible,
  type,
  onClose,
  onAction,
  isLoading = false,
  initialValue = ''
}: GroupActionModalProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');

  // Reset value when modal opens/closes or type changes
  useEffect(() => {
    if (isVisible) {
      setValue(initialValue);
    } else {
      setValue('');
    }
  }, [isVisible, type, initialValue]);

  const handleAction = async () => {
    if (!value.trim()) {
      return;
    }

    try {
      await onAction(value.trim());
      setValue('');
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const handleClose = () => {
    setValue('');
    onClose();
  };

  const getModalConfig = () => {
    switch (type) {
      case 'create':
        return {
          title: t('groups.createGroup'),
          subtitle: t('groups.enterGroupName'),
          placeholder: t('groups.groupName'),
          buttonText: t('groups.createGroup'),
          autoCapitalize: 'words' as const,
          autoCorrect: false,
          autoFocus: true
        };
      case 'join':
        return {
          title: t('groups.joinGroup'),
          subtitle: t('groups.enterInvitationCode'),
          placeholder: t('groups.invitationCode'),
          buttonText: t('groups.joinGroup'),
          autoCapitalize: 'characters' as const,
          autoCorrect: false,
          autoFocus: true
        };
      case 'addMember':
        return {
          title: t('matchEntry.addMemberModal.title'),
          subtitle: t('matchEntry.addMemberModal.memberName'),
          placeholder: t('matchEntry.addMemberModal.enterMemberName'),
          buttonText: t('common.save'),
          autoCapitalize: 'words' as const,
          autoCorrect: false,
          autoFocus: true
        };
      default:
        return {
          title: '',
          subtitle: '',
          placeholder: '',
          buttonText: '',
          autoCapitalize: 'none' as const,
          autoCorrect: false,
          autoFocus: false
        };
    }
  };

  const config = getModalConfig();
  const isDisabled = !value.trim() || isLoading;

  if (!isVisible) {
    return null;
  }

  return (
    <TouchableWithoutFeedback onPress={handleClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
          style={styles.keyboardAvoidingView}
        >
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{config.title}</Text>
              {config.subtitle && <Text style={styles.modalSubtitle}>{config.subtitle}</Text>}

              <View style={styles.inputContainer}>
                {type === 'addMember' && <Text style={styles.inputLabel}>{config.subtitle}</Text>}
                <TextInput
                  style={styles.input}
                  placeholder={config.placeholder}
                  placeholderTextColor="#718096"
                  autoFocus={config.autoFocus}
                  value={value}
                  onChangeText={setValue}
                  autoCapitalize={config.autoCapitalize}
                  autoCorrect={config.autoCorrect}
                  maxLength={type === 'addMember' ? 50 : undefined}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.cancelButton,
                    isLoading && styles.disabledButton
                  ]}
                  onPress={handleClose}
                  disabled={isLoading}
                >
                  <Text
                    style={[
                      styles.cancelButtonText,
                      isLoading && styles.disabledButtonText
                    ]}
                  >
                    {t('common.cancel')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalButton,
                    styles.confirmButton,
                    isDisabled && styles.disabledButton
                  ]}
                  onPress={handleAction}
                  disabled={isDisabled}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text
                      style={[styles.confirmButtonText, isDisabled && styles.disabledButtonText]}
                    >
                      {config.buttonText}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 8,
    textAlign: 'center'
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 24,
    textAlign: 'center',
    fontWeight: '500'
  },
  inputContainer: {
    marginBottom: 24
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8
  },
  input: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#F7FAFC',
    fontWeight: '500',
    color: '#2D3748'
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center'
  },
  cancelButton: {
    backgroundColor: '#F7FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0'
  },
  confirmButton: {
    backgroundColor: '#667eea'
  },
  disabledButton: {
    backgroundColor: '#E2E8F0'
  },
  cancelButtonText: {
    color: '#4A5568',
    fontSize: 16,
    fontWeight: '600'
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  disabledButtonText: {
    opacity: 0.5
  }
});
