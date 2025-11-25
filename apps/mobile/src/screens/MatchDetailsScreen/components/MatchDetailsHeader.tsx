import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MatchDetailsHeaderProps {
  title: string;
  canDelete: boolean;
  isDeleting: boolean;
  onBack: () => void;
  onDelete: () => void;
}

const MatchDetailsHeader: React.FC<MatchDetailsHeaderProps> = ({
  title,
  canDelete,
  isDeleting,
  onBack,
  onDelete
}) => (
  <View style={styles.headerBar}>
    <TouchableOpacity style={styles.backButton} onPress={onBack}>
      <Ionicons name="arrow-back" size={24} color="#2D3748" />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>{title}</Text>
    {canDelete ? (
      <TouchableOpacity style={styles.deleteButton} disabled={isDeleting} onPress={onDelete}>
        {isDeleting ? (
          <ActivityIndicator size="small" color="#FF6B9D" />
        ) : (
          <Ionicons name="trash-outline" size={24} color="#FF6B9D" />
        )}
      </TouchableOpacity>
    ) : (
      <View style={styles.headerSpacer} />
    )}
  </View>
);

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8F9FF'
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
    flex: 1,
    textAlign: 'center'
  },
  headerSpacer: {
    width: 40
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end'
  }
});

export default MatchDetailsHeader;
