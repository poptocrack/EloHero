import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface HeaderMenuDropdownProps {
  isVisible: boolean;
  onClose: () => void;
  onRemoveMember: () => void;
  isRemoving: boolean;
}

export default function HeaderMenuDropdown({
  isVisible,
  onClose,
  onRemoveMember,
  isRemoving
}: HeaderMenuDropdownProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const handleRemovePress = (): void => {
    onClose();
    onRemoveMember();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Modal transparent visible={isVisible} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.overlay, { paddingTop: insets.top + 60 }]}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.dropdownContainer}>
              <TouchableOpacity
                style={[styles.menuItem, isRemoving && styles.menuItemDisabled]}
                onPress={handleRemovePress}
                disabled={isRemoving}
              >
                <View style={styles.menuItemIconContainer}>
                  <Ionicons name="person-remove" size={20} color="#c62828" />
                </View>
                <Text style={styles.menuItemText}>
                  {isRemoving ? t('common.loading') : t('playerProfile.removeFromGroup')}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingRight: 20
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden'
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
    minHeight: 56
  },
  menuItemDisabled: {
    opacity: 0.5
  },
  menuItemIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(198, 40, 40, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c62828',
    flex: 1,
    textAlignVertical: 'center',
    includeFontPadding: false,
    flexWrap: 'wrap'
  }
});
