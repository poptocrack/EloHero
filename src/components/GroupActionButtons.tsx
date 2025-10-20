import React from 'react';
import { View, StyleSheet } from 'react-native';
import PillButton from './PillButton';

interface GroupActionButtonsProps {
  onCreateGroup: () => void;
  onJoinGroup: () => void;
  disabled?: boolean;
}

export default function GroupActionButtons({
  onCreateGroup,
  onJoinGroup,
  disabled = false
}: GroupActionButtonsProps) {
  return (
    <View style={styles.container}>
      <PillButton title="Créer un groupe" onPress={onCreateGroup} disabled={disabled} />
      <PillButton title="Rejoindre un groupe" onPress={onJoinGroup} disabled={disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#fafafa' // Light off-white background like in the screenshot
  }
});
