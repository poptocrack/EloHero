import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface Group {
  name: string;
  description?: string;
}

interface GroupHeaderProps {
  group: Group;
  onBackPress: () => void;
}

export default function GroupHeader({ group, onBackPress }: GroupHeaderProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Ionicons name="arrow-back" size={24} color="#2D3748" />
        </TouchableOpacity>
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{group.name}</Text>
          {group.description && <Text style={styles.groupDescription}>{group.description}</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#F7FAFC'
  },
  groupInfo: {
    flex: 1,
    justifyContent: 'center'
  },
  groupName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3748',
    textTransform: 'capitalize'
  },
  groupDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4A5568',
    marginTop: 4
  }
});
