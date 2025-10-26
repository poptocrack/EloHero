import React from 'react';
import { Modal } from 'react-native';
import GroupActionModal from '../../../components/GroupActionModal';

interface AddMemberModalProps {
  visible: boolean;
  isAddingMember: boolean;
  onAddMember: (name: string) => Promise<void>;
  onCancel: () => void;
}

export default function AddMemberModal({
  visible,
  isAddingMember,
  onAddMember,
  onCancel
}: AddMemberModalProps) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onCancel}>
      <GroupActionModal
        isVisible={visible}
        type="addMember"
        onClose={onCancel}
        onAction={onAddMember}
        isLoading={isAddingMember}
      />
    </Modal>
  );
}
