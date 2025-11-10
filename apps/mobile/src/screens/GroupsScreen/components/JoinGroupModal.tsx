import React from 'react';
import GroupActionModal from '../../../components/GroupActionModal';

interface JoinGroupModalProps {
  isVisible: boolean;
  onClose: () => void;
  onJoin: (code: string) => Promise<void>;
}

export default function JoinGroupModal({ isVisible, onClose, onJoin }: JoinGroupModalProps) {
  return <GroupActionModal isVisible={isVisible} type="join" onClose={onClose} onAction={onJoin} />;
}
