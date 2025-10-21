import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import { useTranslation } from 'react-i18next';

interface AddMemberModalProps {
  visible: boolean;
  memberName: string;
  isAddingMember: boolean;
  onNameChange: (name: string) => void;
  onAddMember: () => void;
  onCancel: () => void;
}

export default function AddMemberModal({
  visible,
  memberName,
  isAddingMember,
  onNameChange,
  onAddMember,
  onCancel
}: AddMemberModalProps) {
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('matchEntry.addMemberModal.title')}</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t('matchEntry.addMemberModal.memberName')}</Text>
            <TextInput
              style={styles.textInput}
              value={memberName}
              onChangeText={onNameChange}
              placeholder={t('matchEntry.addMemberModal.enterMemberName')}
              placeholderTextColor="#718096"
              autoFocus={true}
              maxLength={50}
            />
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={onCancel}
              disabled={isAddingMember}
            >
              <Text style={styles.modalCancelButtonText}>{t('common.cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalSaveButton, isAddingMember && styles.disabledButton]}
              onPress={onAddMember}
              disabled={isAddingMember}
            >
              {isAddingMember ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.modalSaveButtonText}>{t('common.save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
    marginBottom: 20,
    textAlign: 'center'
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
  textInput: {
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2D3748',
    backgroundColor: '#F7FAFC'
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center'
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568'
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#667eea',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  modalSaveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  },
  disabledButton: {
    backgroundColor: '#E2E8F0'
  }
});
