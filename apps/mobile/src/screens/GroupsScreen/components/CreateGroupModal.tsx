import React from 'react';
import GroupActionModal from '../../../components/GroupActionModal';

interface CreateGroupModalProps {
  isVisible: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  isLoading?: boolean;
}

export default function CreateGroupModal({
  isVisible,
  onClose,
  onCreate,
  isLoading = false
}: CreateGroupModalProps) {
  return (
    <GroupActionModal
      isVisible={isVisible}
      type="create"
      onClose={onClose}
      onAction={onCreate}
      isLoading={isLoading}
      awaitActionCompletion={false}
    />
  );
}
