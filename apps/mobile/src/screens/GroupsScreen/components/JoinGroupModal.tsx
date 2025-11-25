import React from 'react';
import GroupActionModal from '../../../components/GroupActionModal';

interface JoinGroupModalProps {
  isVisible: boolean;
  onClose: () => void;
  onJoin: (code: string) => Promise<void>;
  isLoading?: boolean;
}

export default function JoinGroupModal({
  isVisible,
  onClose,
  onJoin,
  isLoading = false
}: Readonly<JoinGroupModalProps>) {
  return (
    <GroupActionModal
      isVisible={isVisible}
      type="join"
      onClose={onClose}
      onAction={onJoin}
      isLoading={isLoading}
    />
  );
}
