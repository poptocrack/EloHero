import React from 'react';
import GroupActionModal from '../../../components/GroupActionModal';

interface CreateGroupModalProps {
  isVisible: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}

export default function CreateGroupModal({ isVisible, onClose, onCreate }: CreateGroupModalProps) {
  return (
    <GroupActionModal isVisible={isVisible} type="create" onClose={onClose} onAction={onCreate} />
  );
}
