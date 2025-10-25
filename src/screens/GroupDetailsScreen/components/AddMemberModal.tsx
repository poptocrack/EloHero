import React from 'react';
import { Modal } from 'react-native';
import GroupActionModal from '../../../components/GroupActionModal';

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
  const handleAction = async (name: string) => {
    onNameChange(name);
    await onAddMember();
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onCancel}>
      <GroupActionModal
        isVisible={visible}
        type="addMember"
        onClose={onCancel}
        onAction={handleAction}
        isLoading={isAddingMember}
        initialValue={memberName}
      />
    </Modal>
  );
}
