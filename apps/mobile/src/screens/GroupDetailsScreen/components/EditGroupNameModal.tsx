import React from 'react';
import { Modal } from 'react-native';
import GroupActionModal from '../../../components/GroupActionModal';

interface EditGroupNameModalProps {
  visible: boolean;
  isUpdating: boolean;
  currentName: string;
  onUpdate: (name: string) => Promise<void>;
  onCancel: () => void;
}

export default function EditGroupNameModal({
  visible,
  isUpdating,
  currentName,
  onUpdate,
  onCancel
}: EditGroupNameModalProps) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onCancel}>
      <GroupActionModal
        isVisible={visible}
        type="editGroupName"
        onClose={onCancel}
        onAction={onUpdate}
        isLoading={isUpdating}
        initialValue={currentName}
      />
    </Modal>
  );
}

