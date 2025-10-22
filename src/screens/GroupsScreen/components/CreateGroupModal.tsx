import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

interface CreateGroupModalProps {
  isVisible: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export default function CreateGroupModal({ isVisible, onClose, onCreate }: CreateGroupModalProps) {
  const { t } = useTranslation();
  const [groupName, setGroupName] = useState('');

  const handleCreate = async () => {
    if (!groupName.trim()) {
      return;
    }

    try {
      await onCreate(groupName.trim());
      setGroupName('');
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
    }
  };

  const handleClose = () => {
    setGroupName('');
    onClose();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>{t('groups.createGroup')}</Text>
        <Text style={styles.modalSubtitle}>{t('groups.enterGroupName')}</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder={t('groups.groupName')}
            value={groupName}
            onChangeText={setGroupName}
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus={true}
          />
        </View>

        <View style={styles.modalActions}>
          <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modalButton, styles.confirmButton]}
            onPress={handleCreate}
            disabled={!groupName.trim()}
          >
            <Text
              style={[styles.confirmButtonText, !groupName.trim() && styles.disabledButtonText]}
            >
              {t('groups.createGroup')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
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
