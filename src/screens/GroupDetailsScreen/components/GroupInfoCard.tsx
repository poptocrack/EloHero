import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Group {
  name: string;
  description?: string;
}

interface GroupInfoCardProps {
  group: Group;
}

export default function GroupInfoCard({ group }: GroupInfoCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.groupName}>{group.name}</Text>
      {group.description && <Text style={styles.groupDescription}>{group.description}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  groupName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3748',
    textTransform: 'capitalize',
    marginBottom: 8
  },
  groupDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A5568',
    lineHeight: 22
  }
});

